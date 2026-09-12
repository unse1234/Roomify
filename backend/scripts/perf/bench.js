import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import exec from 'k6/execution';

/**
 * Repeatable step-load benchmark for the Roomify property search.
 *
 *   TARGET=search|health|ready   which endpoint to hammer (default: search)
 *   BASE_URL=...                 default: the Render deployment
 *   STAGE_SECONDS=45             steady-state seconds per VU level
 *   LABEL=before|after|...       free-form tag echoed in the summary
 *
 * Four sequential constant-VU scenarios (10 / 50 / 100 / 200) so every VU
 * level gets its own clean percentiles instead of one blended number.
 * Think time matches scripts/geospatial-load-test.js (0.5-1.5s) so the
 * offered load is identical to the original test.
 */

const BASE_URL = __ENV.BASE_URL || 'https://roomify-api-mu7c.onrender.com';
const TARGET = __ENV.TARGET || 'search';
const STAGE = Number(__ENV.STAGE_SECONDS || 45);
const WARMUP = 15;

const PATHS = {
  search: '/api/properties?lng=73.0479&lat=33.6844&radius=30000&minPrice=2000&maxPrice=5000&page=1&limit=12',
  health: '/health',
  ready: '/ready',
};

const url = `${BASE_URL}${PATHS[TARGET]}`;

const LEVELS = [10, 50, 100, 200];
const scenarios = {};
LEVELS.forEach((vus, i) => {
  scenarios[`vu${vus}`] = {
    executor: 'constant-vus',
    vus,
    duration: `${STAGE}s`,
    startTime: `${WARMUP + i * (STAGE + 10)}s`,
    tags: { level: String(vus) },
    exec: 'hit',
  };
});
// Short warm-up so the first measured stage is not paying for TLS handshakes
// and a cold connection pool.
scenarios.warmup = {
  executor: 'constant-vus',
  vus: 5,
  duration: `${WARMUP - 3}s`,
  startTime: '0s',
  tags: { level: 'warmup' },
  exec: 'hit',
};

export const options = {
  scenarios,
  thresholds: {},
  summaryTrendStats: ['avg', 'min', 'med', 'p(95)', 'p(99)', 'max', 'count'],
  noConnectionReuse: false,
  discardResponseBodies: false,
};

const perLevel = {};
LEVELS.forEach((v) => { perLevel[`vu${v}`] = new Trend(`lat_vu${v}`, true); });

export function hit() {
  const res = http.get(url, {
    headers: { 'User-Agent': 'k6-roomify-bench' },
    timeout: '60s',
    tags: { name: TARGET },
  });

  const t = perLevel[exec.scenario.name];
  if (t) t.add(res.timings.duration);

  check(res, {
    'status 200': (r) => r.status === 200,
    'valid body': (r) => TARGET !== 'search' || (r.body && r.body.indexOf('"success":true') !== -1),
  });

  sleep(0.5 + Math.random() * 1.0);
}

export function handleSummary(data) {
  const m = data.metrics;
  const g = (name, stat) => {
    const v = m[name];
    return v && v.values && v.values[stat] !== undefined ? v.values[stat] : null;
  };
  const fmt = (n) => (n === null ? '-' : `${n.toFixed(0)}ms`);

  const rows = LEVELS.map((v) => {
    const key = `lat_vu${v}`;
    return {
      vus: v,
      count: g(key, 'count'),
      rps: null,
      avg: g(key, 'avg'),
      med: g(key, 'med'),
      p95: g(key, 'p(95)'),
      p99: g(key, 'p(99)'),
      max: g(key, 'max'),
    };
  });

  let out = `\n=== ${__ENV.LABEL || 'run'} | target=${TARGET} | ${url} ===\n`;
  out += `| VUs | reqs |    RPS |    avg |    p50 |    p95 |    p99 |    max |\n`;
  out += `| --: | ---: | -----: | -----: | -----: | -----: | -----: | -----: |\n`;
  for (const r of rows) {
    const rps = r.count ? (r.count / STAGE).toFixed(1) : '-';
    out += `| ${String(r.vus).padStart(3)} | ${String(r.count ?? '-').padStart(4)} | ${String(rps).padStart(6)} | ${fmt(r.avg).padStart(6)} | ${fmt(r.med).padStart(6)} | ${fmt(r.p95).padStart(6)} | ${fmt(r.p99).padStart(6)} | ${fmt(r.max).padStart(6)} |\n`;
  }
  const failed = m.http_req_failed ? (m.http_req_failed.values.rate * 100).toFixed(2) : '?';
  const checksFailed = m.checks ? (100 - m.checks.values.rate * 100).toFixed(2) : '?';
  out += `errors: ${failed}%  failed-checks: ${checksFailed}%  total reqs: ${m.http_reqs ? m.http_reqs.values.count : '?'}\n`;
  out += `conn breakdown (all levels): connecting avg ${fmt(g('http_req_connecting','avg'))} tls ${fmt(g('http_req_tls_handshaking','avg'))} sending ${fmt(g('http_req_sending','avg'))} waiting(TTFB) avg ${fmt(g('http_req_waiting','avg'))} p95 ${fmt(g('http_req_waiting','p(95)'))} receiving ${fmt(g('http_req_receiving','avg'))}\n`;

  return {
    stdout: out,
    [`${__ENV.OUT || 'bench'}.json`]: JSON.stringify(data, null, 2),
  };
}
