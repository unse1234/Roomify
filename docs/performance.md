# Performance: the geospatial property search

How `GET /api/properties` behaves under load, where its time actually goes,
and how to re-measure any of it. Every number here came from the scripts in
`backend/scripts/perf/`; none of it is estimated.

The endpoint under test throughout:

```
GET /api/properties?lng=73.0479&lat=33.6844&radius=30000&minPrice=2000&maxPrice=5000&page=1&limit=12
```

---

## The measurement rig

| Tool | What it answers |
| --- | --- |
| `scripts/perf/bench.js` | k6 step load at 10 / 50 / 100 / 200 VUs, each level its own scenario so percentiles are per-level rather than blended. |
| `scripts/perf/seed-bench-db.js` | Builds an **isolated** `<db>_bench` database with 15k synthetic properties. Production holds single digits, so without this a load test measures the framework, not the query. |
| `scripts/perf/compare-pipelines.js` | Times candidate pipeline shapes against that corpus, with `explain("executionStats")` so documents-examined is visible next to the clock. |
| `scripts/perf/verify-equivalence.js` | Asserts a rewritten pipeline returns identical totals, ids, ordering, distances and field sets across 14 filter/page combinations. |
| `PERF_DIAGNOSTICS=true` | `Server-Timing` phase breakdown per response, plus `GET /__perf` (event-loop delay, CPU consumed, cgroup quota and throttling counters, pool saturation) and `GET /__perf/profile` (V8 CPU profile). |

Running them:

```bash
# 1. isolated corpus (never touches real data)
node scripts/perf/seed-bench-db.js 15000

# 2. pipeline shapes, server-side
MONGO_URI="<cluster>/<db>_bench" node scripts/perf/compare-pipelines.js
MONGO_URI="<cluster>/<db>_bench" node scripts/perf/verify-equivalence.js

# 3. end-to-end step load
TARGET=search BASE_URL=https://your-api k6 run scripts/perf/bench.js
TARGET=health BASE_URL=https://your-api k6 run scripts/perf/bench.js   # control

# 4. tear down
node scripts/perf/seed-bench-db.js --drop
```

### Always run the `/health` control

`TARGET=health` drives the identical VU curve at an endpoint that touches no
database and no controller, through the same middleware stack. Whatever
latency it shows at a given VU level is network plus instance saturation —
a floor no application change can go below. Subtracting it is the only
honest way to talk about what the endpoint itself costs.

---

## What the Render free tier actually gives you

Read from inside the container (`GET /__perf`), over ~15 minutes spanning
four load tests:

```
cpuLimitCores    0.15          cgroup quota: 15% of one core (the host has 8)
nr_periods       7,846
nr_throttled     4,205         53.6% of CFS scheduling periods hit the quota
usage_usec       70.0 s        CPU actually consumed
throttled_usec   742.8 s       time the kernel FROZE the process at the quota
memory           86 MB / 512 MB
```

The process spent **10.6x longer frozen by the CPU quota than executing**.
That is the single most important number in this document.

Throttling tracks offered load exactly. Sampling `/__perf` every 5s through
a 10 → 50 → 100 → 200 VU ramp:

| VUs | CPU used (cores) | Event-loop delay (mean) | Periods throttled in the window | Pool queue |
| --: | --: | --: | --: | --: |
| 10 | 0.04 – 0.06 | 10 ms | ~30 | 0 |
| 50 | 0.141 – 0.149 | 25 – 93 ms | 362 | 0 |
| 100 | 0.147 – 0.149 | 85 – 98 ms | 387 | 0 |
| 200 | 0.136 – 0.149 | 50 – 93 ms | 386 | 0 |

From 50 VUs upward the process is **pinned at its 0.15-core quota** and the
event-loop delay rises with it. The event loop is not slow because of
blocking JavaScript — it is slow because the kernel keeps stopping the
process.

`3.0 ms CPU per request ÷ 0.15 cores ≈ 50 requests/second`, and the measured
ceiling across every run was 44–48 rps. The arithmetic and the load test
agree.

### What is *not* the problem here

- **Memory.** 86 MB of 512 MB. No pressure, no swapping.
- **The connection pool.** Across 16,837 queries the average checkout wait
  was **1.3 ms** and peak concurrent HTTP requests reached 22. The pool
  never queued. Raising `maxPoolSize` on this instance would change nothing.
- **MongoDB.** Atlas RTT from Render is **61 ms**; server-side execution on
  the live collection is ~3 ms. The reported per-query time rises to ~118 ms
  under load, but that extra time is the throttled event loop taking longer
  to resume the promise after the reply has already arrived — not the
  database.

### Two more free-tier behaviours worth knowing

- **Spin-down.** A free service sleeps after ~15 minutes of inactivity; the
  next request pays a cold start. A sustained load test never sees this, but
  real first-visitors do.
- **Cold connection cost.** A fresh TLS handshake to the edge added ~170 ms
  in these measurements (761 ms first request vs ~250 ms once keep-alive was
  established). Benchmarks that reuse connections will look better than a
  real browser's first paint.

---

## Where the time goes

### At low concurrency, most of the wall clock is not the server

Measured from a client in Pakistan against the Render deployment:

| | TTFB |
| --- | --- |
| `/health` (no DB, no controller) | ~245 ms |
| `/api/properties` (full geo search) | ~320 ms |
| **difference = everything the endpoint does** | **~75 ms** |

With keep-alive the floor drops to ~135 ms, but the shape holds: at 10 VUs
the endpoint's own work is a minority of the response time. Reporting
"240 ms average at 10 VUs" as an application number overstates the
application by roughly 3×.

### CPU cost per request

From a V8 CPU profile taken under sustained load (`/__perf/profile`),
attributed by call-stack subtree:

| Component | ms CPU / request | share |
| --- | --- | --- |
| Node HTTP layer (parse, write, streams) | 0.93 | 27% |
| MongoDB driver | 0.64 | 19% |
| Express + router + body/cookie parsing | 0.41 | 12% |
| BSON encode/decode | 0.31 | 9% |
| Request logger → stdout | 0.27 | 8% |
| zod query validation | 0.09 | 3% |
| Mongoose | 0.06 | 2% |
| compression (gzip) | 0.06 | 2% |
| cors + helmet | 0.05 | 1% |
| **the property controller itself** | **0.02** | **0.6%** |

Total ≈ **3.0 ms of CPU per request**. The controller is 0.6% of it. This
matters because on a CPU-capped instance the throughput ceiling is
`CPU quota ÷ CPU per request` — 3.0 ms/request against Render free's
0.15-core quota is roughly 50 requests/second, no matter how fast MongoDB
answers.

The practical consequence: on a small instance, *reducing CPU per request*
is the only code-level lever on throughput, and there is very little fat to
cut here — it is nearly all framework and driver floor.

### The query, at a realistic size

Against 15,000 properties (`compare-pipelines.js`, 15 iterations each; the
network baseline of ~130 ms has been subtracted):

| Shape | Server-side | Docs examined | Round trips |
| --- | --- | --- | --- |
| `$geoNear → $facet{$sort,$skip,$limit \| $count}` (original) | 64 ms | 19,028 | 1 |
| same, minus the redundant `$sort` | 70 ms | 19,028 | 1 |
| `$geoNear → $limit → $skip` (no count at all) | 13 ms | 4,190 | 1 |
| split: page + `$geoWithin` count, in parallel | 16 ms | 4,576 | 2 |
| **`$geoNear → $limit → $skip → $unionWith` count (current)** | **21 ms** | **4,576** | **1** |
| split, sequential | 150 ms | 4,576 | 2 |

---

## Why the pipeline changed

Inside a `$facet`, the count branch consumes every match. The planner
therefore cannot push the page's `$limit` into `$geoNear`, so the stage
fetches and distance-ranks **every candidate inside the radius** in order to
return twelve rows — 19,028 documents examined for a 12-row page.

Taking the page out of the facet lets the `$limit` push down, and `$geoNear`
stops as soon as the page is full: 4,190 examined, 21 ms instead of 76 ms.

The count is then a `$geoWithin` / `$centerSphere` match, which answers from
the same 2dsphere index **without computing or sorting distances**: 386
documents examined, ~6 ms.

Two details worth keeping in mind:

- **The count was never the bottleneck.** Dropping it entirely saves only
  another ~8 ms (13 ms vs 21 ms). Pagination metadata is cheap; keep it.
- **`$unionWith` rather than two parallel queries.** Parallel is marginally
  faster in isolation but holds two pooled connections for the full
  round-trip each. Once the pool is the scarce resource, doubling
  connection-hold time costs more than the few milliseconds it saves.
  `$unionWith` gets both answers in one round trip on one connection.

Because `$unionWith` does not promise an output order, the count row is
identified by a marker field rather than its position, and the page is
ordered in JS — a sort over at most `limit` rows, replacing a server-side
sort over the entire match set.

`verify-equivalence.js` proves the response is unchanged across 14
filter/page combinations, including empty results, pages past the end,
`$or` text search, `$all` amenities, and 1 km / 200 km radii.

---

## The connection pool

The ceiling on concurrent database work is:

```
max concurrent queries = maxPoolSize ÷ (round-trip time + server execution time)
```

The round trip dominates whenever the app and the cluster are far apart. At
a measured 130 ms RTT with `maxPoolSize: 20`, that is ~150 queries/second —
and making the *query* faster barely moves it, because the query is 20 ms of
a 150 ms connection hold.

This is observable rather than theoretical. `GET /__perf` under 200 VUs,
`maxPoolSize: 20`:

```
poolOut=20  poolWait=90..144  avgCheckOutWait=700ms  cpuCores=0.25  loopMean=14ms
```

Twenty connections busy, ~100 requests queued for one, while CPU sits at a
quarter of a core and the event loop is idle. Raising the pool to 75:

```
poolOut=39..75  poolWait=1..39  avgCheckOutWait=120ms
```

RPS 84 → 115 and p50 1395 ms → 664 ms at 200 VUs.

**This does not mean "set the pool to 75".** It means the pool is only worth
raising once it is actually the scarce resource, which depends on the
deployment:

- Measure the round trip first: `GET /__perf?ping=1`.
- Compare the pool ceiling against the CPU ceiling. If the instance runs out
  of CPU at 50 rps and the pool allows 240, the pool is not the problem and
  raising it changes nothing.
- Every connection counts against the cluster's own limit (500 on Atlas M0),
  shared across all instances, plus Socket.io and the cron jobs.

Hence `MONGO_MAX_POOL_SIZE` / `MONGO_MIN_POOL_SIZE` are configuration, with
the defaults left at 20/2.

---

## Things deliberately not done

- **Caching the search results.** It would produce excellent benchmark
  numbers and would not make the endpoint faster; it would make the
  benchmark stop testing the endpoint.
- **Trimming the response payload.** `description`, `publicId` and `__v` are
  unused by the listing card, but removing them changes the response
  contract. Worth doing as a deliberate, versioned change — not smuggled in
  as an optimization.
- **Removing or sampling the access log** (~0.27 ms CPU/request, ~9%).
  Real throughput on a CPU-capped instance, but losing per-request
  observability is a poor trade for 9%.
- **Adding indexes.** The existing 2dsphere index is the right one and is
  being used. The fix was letting the planner stop early, not giving it
  another index to choose from.
- **Dropping `$geoNear`.** It is the correct operator; the problem was the
  stage it was wrapped in.


---

## Measured on the live instance: compression

The CPU profile taken *on Render* (Node 20, real hardware) attributes ~11%
of busy CPU to gzip — far more than the same profile on a development
machine suggested. Testing it without redeploying, by having the load
generator send `Accept-Encoding: identity` so `compression()` skips:

| 100 VUs, 45s | RPS | p95 |
| --- | --: | --: |
| gzip on (default) | 39.6 | 2.66 s |
| gzip skipped | 42.7 | 2.10 s |

**Left on deliberately.** ~8% throughput is real on a CPU-capped instance,
but the origin sits a long way from the Cloudflare edge that fronts it, and
these responses grow well past the 2 KB the production dataset currently
produces. Paying 8% of a small CPU budget to send a fifth of the bytes over
that hop is the better trade. Revisit if the instance is ever co-located
with its clients.

---

## Before / after

### On Render (production data: 8 properties)

| VUs | Before p95 | After p95 | Before RPS | After RPS |
| --: | --: | --: | --: | --: |
| 10 | 331 ms | 249 ms | 8.2 | 8.4 |
| 50 | 991 ms | 1016 ms | 34.4 | 35.5 |
| 100 | 2285 ms | 2262 ms | 44.4 | 44.5 |
| 200 | 5585 ms | 6414 ms | 47.9 | 45.2 |

**No meaningful change, and none was available.** The production collection
holds 8 documents, so both pipeline shapes examine 6 of them in ~3 ms; and
the instance is throttle-bound long before the query matters. Run-to-run
spread on a throttled free instance is wider than any difference here.

Reporting this honestly matters more than the table looking good: the code
change is correct and pays for itself at scale, but it did not and could not
speed up this deployment.

### Server-side query, 15k properties

This is where the change actually shows up:

| | Docs examined | Server time |
| --- | --: | --: |
| Before (`$facet`) | 19,028 | 76 ms |
| After (`$limit` pushdown + `$unionWith`) | 4,576 | 21 ms |

**4.2x fewer documents examined, 3.6x less server time**, for an identical
response.
