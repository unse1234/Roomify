import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import inspector from "node:inspector";
import os from "node:os";
import { config } from "../config/config.js";

/**
 * Temporary performance diagnostics, entirely gated behind
 * PERF_DIAGNOSTICS=true. When the flag is off every export here is a no-op
 * or a cheap constant, so the production request path is unchanged: no
 * timers are read, no headers are set, and /__perf 404s.
 *
 * The point of this module is to answer one question with measurements
 * instead of guesswork: when the property search is slow under load, is the
 * time going to MongoDB, to this process's own CPU, or to waiting for a
 * turn on a saturated event loop / connection pool?
 */

export const PERF_ENABLED = config.PERF_DIAGNOSTICS;

// ─── Event loop delay ────────────────────────────────────────────────────
// The single most direct signal of "this process is CPU-starved". If the
// loop is routinely late by hundreds of ms, requests are queueing behind
// synchronous work (or behind a throttled CPU quota), not behind the DB.
const loopDelay = PERF_ENABLED ? monitorEventLoopDelay({ resolution: 10 }) : null;
loopDelay?.enable();

// ─── Connection pool + in-flight counters ────────────────────────────────
const pool = {
  checkedOut: 0,
  waiting: 0,
  created: 0,
  checkOutWaitMsTotal: 0,
  checkOutCount: 0,
  checkOutWaitMsMax: 0,
};

const http = { inFlight: 0, inFlightMax: 0, completed: 0 };

const mongoTime = { totalMs: 0, count: 0, maxMs: 0 };

/**
 * Subscribe to the driver's CMAP events so pool saturation is observable.
 * Called once from connectDB, and only when diagnostics are on.
 */
export const instrumentPool = (client) => {
  if (!PERF_ENABLED || !client) return;

  // connectionCheckOutStarted carries no connection id (none is assigned
  // yet), so waits are matched FIFO against the checkout queue instead.
  const waitQueue = [];
  const settleWait = () => {
    const began = waitQueue.shift();
    if (began === undefined) return;
    const waited = performance.now() - began;
    pool.checkOutWaitMsTotal += waited;
    pool.checkOutCount += 1;
    if (waited > pool.checkOutWaitMsMax) pool.checkOutWaitMsMax = waited;
  };

  client.on("connectionCreated", () => {
    pool.created += 1;
  });
  client.on("connectionCheckOutStarted", () => {
    pool.waiting += 1;
    waitQueue.push(performance.now());
  });
  client.on("connectionCheckedOut", () => {
    pool.waiting = Math.max(0, pool.waiting - 1);
    pool.checkedOut += 1;
    settleWait();
  });
  client.on("connectionCheckedIn", () => {
    pool.checkedOut = Math.max(0, pool.checkedOut - 1);
  });
  client.on("connectionCheckOutFailed", () => {
    pool.waiting = Math.max(0, pool.waiting - 1);
    settleWait();
  });
};

/** Count concurrent in-flight requests, so queue depth is visible. */
export const perfRequestCounter = (req, res, next) => {
  http.inFlight += 1;
  if (http.inFlight > http.inFlightMax) http.inFlightMax = http.inFlight;
  res.on("finish", () => {
    http.inFlight -= 1;
    http.completed += 1;
  });
  next();
};

// ─── Per-request phase timer ─────────────────────────────────────────────
const NOOP_TIMER = {
  enabled: false,
  mark() {},
  recordMongo() {},
  finish() {},
  send(res, payload) {
    res.status(200).json(payload);
  },
};

/**
 * Phase timer for a single request. `mark(name)` closes the previous phase,
 * `send()` measures JSON serialization and emits everything as a
 * Server-Timing header so a load generator can read server-side numbers
 * without shell access to the host.
 */
export const startPerf = () => {
  if (!PERF_ENABLED) return NOOP_TIMER;

  const t0 = performance.now();
  let last = t0;
  const parts = [];

  return {
    enabled: true,
    mark(name) {
      const now = performance.now();
      parts.push(`${name};dur=${(now - last).toFixed(1)}`);
      last = now;
    },
    recordMongo(ms) {
      mongoTime.totalMs += ms;
      mongoTime.count += 1;
      if (ms > mongoTime.maxMs) mongoTime.maxMs = ms;
    },
    send(res, payload) {
      const beforeSerialize = performance.now();
      const body = JSON.stringify(payload);
      const serializeMs = performance.now() - beforeSerialize;

      parts.push(`serialize;dur=${serializeMs.toFixed(1)}`);
      parts.push(`bytes;dur=${body.length}`);
      parts.push(`inflight;dur=${http.inFlight}`);
      parts.push(`loopmean;dur=${(loopDelay.mean / 1e6).toFixed(1)}`);
      parts.push(`total;dur=${(performance.now() - t0).toFixed(1)}`);

      res.status(200);
      res.setHeader("Server-Timing", parts.join(", "));
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(body);
    },
  };
};

// ─── Container limits ────────────────────────────────────────────────────
const readFile = (path) => {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
};

/**
 * Read the cgroup CPU quota and throttling counters. On a container host
 * (Render, Fly, ECS...) `cpu.stat`'s nr_throttled / throttled_usec is direct
 * proof of whether the platform is capping this process's CPU — the
 * difference between "my code is slow" and "my plan is small".
 */
const containerLimits = () => {
  const v2Max = readFile("/sys/fs/cgroup/cpu.max");
  const v2Stat = readFile("/sys/fs/cgroup/cpu.stat");
  const v1Quota = readFile("/sys/fs/cgroup/cpu/cpu.cfs_quota_us");
  const v1Period = readFile("/sys/fs/cgroup/cpu/cpu.cfs_period_us");
  const v1Stat = readFile("/sys/fs/cgroup/cpu/cpu.stat");

  let cpuLimit = null;
  if (v2Max && v2Max !== "max") {
    const [quota, period] = v2Max.split(/\s+/).map(Number);
    if (period) cpuLimit = quota / period;
  } else if (v1Quota && v1Period && Number(v1Quota) > 0) {
    cpuLimit = Number(v1Quota) / Number(v1Period);
  }

  const parseStat = (raw) =>
    raw
      ? Object.fromEntries(
          raw.split("\n").map((line) => {
            const [k, v] = line.split(/\s+/);
            return [k, Number(v)];
          }),
        )
      : null;

  return {
    cpuLimitCores: cpuLimit,
    hostCpus: os.cpus()?.length ?? null,
    cpuStat: parseStat(v2Stat) || parseStat(v1Stat),
    memoryMaxBytes: Number(readFile("/sys/fs/cgroup/memory.max")) || null,
    memoryCurrentBytes: Number(readFile("/sys/fs/cgroup/memory.current")) || null,
  };
};

let lastCpuUsage = process.cpuUsage();
let lastCpuAt = performance.now();

/** Snapshot for GET /__perf. Resets the rolling windows it reports. */
export const perfSnapshot = (mongoose) => {
  const now = performance.now();
  const cpu = process.cpuUsage(lastCpuUsage);
  const elapsedMs = now - lastCpuAt;
  lastCpuUsage = process.cpuUsage();
  lastCpuAt = now;

  const cpuCoresUsed = (cpu.user + cpu.system) / 1000 / elapsedMs;

  const snapshot = {
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    // Fraction of a CPU core consumed since the previous /__perf call.
    cpu: {
      coresUsedSinceLastCall: Number(cpuCoresUsed.toFixed(3)),
      windowMs: Math.round(elapsedMs),
    },
    eventLoopDelayMs: loopDelay
      ? {
          mean: Number((loopDelay.mean / 1e6).toFixed(2)),
          p50: Number((loopDelay.percentile(50) / 1e6).toFixed(2)),
          p95: Number((loopDelay.percentile(95) / 1e6).toFixed(2)),
          p99: Number((loopDelay.percentile(99) / 1e6).toFixed(2)),
          max: Number((loopDelay.max / 1e6).toFixed(2)),
        }
      : null,
    memoryMb: Object.fromEntries(
      Object.entries(process.memoryUsage()).map(([k, v]) => [k, Math.round(v / 1048576)]),
    ),
    http: { ...http },
    mongoPool: {
      ...pool,
      configuredMaxPoolSize: mongoose?.connection?.getClient?.()?.options?.maxPoolSize ?? null,
      avgCheckOutWaitMs: pool.checkOutCount
        ? Number((pool.checkOutWaitMsTotal / pool.checkOutCount).toFixed(2))
        : 0,
    },
    mongoQuery: {
      ...mongoTime,
      avgMs: mongoTime.count ? Number((mongoTime.totalMs / mongoTime.count).toFixed(2)) : 0,
    },
    container: containerLimits(),
  };

  loopDelay?.reset();
  return snapshot;
};

/** Round-trip time to the database, isolating Render <-> Atlas network cost. */
export const measureMongoPing = async (mongoose, samples = 5) => {
  const times = [];
  for (let i = 0; i < samples; i += 1) {
    const began = performance.now();
    await mongoose.connection.db.admin().command({ ping: 1 });
    times.push(Number((performance.now() - began).toFixed(2)));
  }
  return {
    samples: times,
    minMs: Math.min(...times),
    avgMs: Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)),
  };
};

// ─── On-demand CPU profile ───────────────────────────────────────────────
// The process exits through process.exit() on SIGTERM, which skips the
// --cpu-prof flush, and on a hosted instance there is no shell to attach a
// profiler from anyway. So collect it in-process on request instead.
let profiling = false;

export const collectCpuProfile = async (seconds = 15) => {
  if (profiling) throw new Error("A CPU profile is already being collected");
  profiling = true;

  const session = new inspector.Session();
  try {
    session.connect();
    const post = (method, params) =>
      new Promise((resolve, reject) => {
        session.post(method, params, (err, result) =>
          err ? reject(err) : resolve(result),
        );
      });

    await post("Profiler.enable");
    await post("Profiler.setSamplingInterval", { interval: 200 });
    await post("Profiler.start");
    await new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
    const { profile } = await post("Profiler.stop");
    return profile;
  } finally {
    session.disconnect();
    profiling = false;
  }
};
