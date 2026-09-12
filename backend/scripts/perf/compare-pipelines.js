import dotenv from "dotenv";
dotenv.config();

const { default: mongoose } = await import("mongoose");
const { default: Property } = await import("../../src/models/property.model.js");

/**
 * Server-side cost of the candidate shapes for the geospatial property
 * search, measured against the isolated benchmark database created by
 * scripts/perf/seed-bench-db.js.
 *
 * Every variant must return the same page of results and the same total,
 * so the comparison is about how the work is expressed, not about doing
 * less work than the endpoint promises. Each is timed end to end from the
 * application's point of view (driver round trip included) and also
 * explained, so the plan and the documents-examined count are visible.
 */

const ITERATIONS = 15;
const LNG = 73.0479;
const LAT = 33.6844;
const RADIUS = 30_000;
const LIMIT = 12;
const SKIP = 0;
const EARTH_RADIUS_METERS = 6_378_100;

const filter = { status: "active", price: { $gte: 2000, $lte: 5000 } };

const geoNearStage = (extra = {}) => ({
  $geoNear: {
    near: { type: "Point", coordinates: [LNG, LAT] },
    distanceField: "distance",
    maxDistance: RADIUS,
    spherical: true,
    query: filter,
    ...extra,
  },
});

const VARIANTS = {
  "A. current ($geoNear -> $facet{$sort,$skip,$limit | $count})": async () => {
    const [r] = await Property.aggregate([
      geoNearStage(),
      {
        $facet: {
          data: [{ $sort: { distance: 1 } }, { $skip: SKIP }, { $limit: LIMIT }],
          metadata: [{ $count: "total" }],
        },
      },
    ]);
    return { data: r?.data || [], total: r?.metadata?.[0]?.total || 0 };
  },

  "B. current minus the redundant $sort": async () => {
    const [r] = await Property.aggregate([
      geoNearStage(),
      {
        $facet: {
          data: [{ $skip: SKIP }, { $limit: LIMIT }],
          metadata: [{ $count: "total" }],
        },
      },
    ]);
    return { data: r?.data || [], total: r?.metadata?.[0]?.total || 0 };
  },

  "C. no count at all ($geoNear -> $skip -> $limit)": async () => {
    const data = await Property.aggregate([
      geoNearStage(),
      { $skip: SKIP },
      { $limit: LIMIT },
    ]);
    return { data, total: null };
  },

  "D. split: $geoNear+limit for page, $geoWithin countDocuments": async () => {
    const [data, total] = await Promise.all([
      Property.aggregate([geoNearStage(), { $limit: SKIP + LIMIT }, { $skip: SKIP }]),
      Property.countDocuments({
        ...filter,
        "address.location": {
          $geoWithin: { $centerSphere: [[LNG, LAT], RADIUS / EARTH_RADIUS_METERS] },
        },
      }),
    ]);
    return { data, total };
  },

  "F. one round trip: $limit pushdown + $unionWith count": async () => {
    const rows = await Property.aggregate([
      geoNearStage(),
      { $limit: SKIP + LIMIT },
      { $skip: SKIP },
      {
        $unionWith: {
          coll: Property.collection.collectionName,
          pipeline: [
            {
              $match: {
                ...filter,
                "address.location": {
                  $geoWithin: { $centerSphere: [[LNG, LAT], RADIUS / EARTH_RADIUS_METERS] },
                },
              },
            },
            { $count: "__total" },
          ],
        },
      },
    ]);
    const last = rows.at(-1);
    const total = last && last.__total !== undefined ? last.__total : 0;
    const data = last && last.__total !== undefined ? rows.slice(0, -1) : rows;
    return { data, total };
  },

  "G. the $geoWithin count on its own": async () => {
    const total = await Property.countDocuments({
      ...filter,
      "address.location": {
        $geoWithin: { $centerSphere: [[LNG, LAT], RADIUS / EARTH_RADIUS_METERS] },
      },
    });
    return { data: [], total };
  },

  "H. the page query on its own (no count)": async () => {
    const data = await Property.aggregate([
      geoNearStage(),
      { $limit: SKIP + LIMIT },
      { $skip: SKIP },
    ]);
    return { data, total: null };
  },

  "E. split, sequential (isolates the parallelism benefit)": async () => {
    const data = await Property.aggregate([
      geoNearStage(),
      { $limit: SKIP + LIMIT },
      { $skip: SKIP },
    ]);
    const total = await Property.countDocuments({
      ...filter,
      "address.location": {
        $geoWithin: { $centerSphere: [[LNG, LAT], RADIUS / EARTH_RADIUS_METERS] },
      },
    });
    return { data, total };
  },
};

const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    avg,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? sorted.at(-1),
    min: sorted[0],
    max: sorted.at(-1),
  };
};

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15_000 });
const dbName = mongoose.connection.db.databaseName;
const docs = await Property.countDocuments({});
console.log(`db: ${dbName}  properties: ${docs}\n`);

// A ping baseline, so the network component of every timing below is known.
const pings = [];
for (let i = 0; i < 10; i += 1) {
  const t = performance.now();
  await mongoose.connection.db.admin().command({ ping: 1 });
  pings.push(performance.now() - t);
}
const pingAvg = pings.reduce((a, b) => a + b, 0) / pings.length;
console.log(`network baseline (admin ping): avg ${pingAvg.toFixed(1)}ms min ${Math.min(...pings).toFixed(1)}ms`);
console.log("every timing below includes one such round trip\n");

const results = [];
for (const [name, run] of Object.entries(VARIANTS)) {
  await run(); // warm up
  const times = [];
  let sample;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const t = performance.now();
    sample = await run();
    times.push(performance.now() - t);
  }
  const s = stats(times);
  results.push({ name, ...s, returned: sample.data.length, total: sample.total });
}

console.log("variant                                                          avg     p50     p95   minus-net  rows  total");
console.log("-".repeat(118));
for (const r of results) {
  console.log(
    `${r.name.padEnd(62)} ${r.avg.toFixed(1).padStart(6)}ms ${r.p50.toFixed(1).padStart(6)}ms ` +
      `${r.p95.toFixed(1).padStart(6)}ms ${(r.avg - pingAvg).toFixed(1).padStart(8)}ms ` +
      `${String(r.returned).padStart(5)} ${String(r.total).padStart(6)}`,
  );
}

// ── Plans and work done, for the two shapes that matter ──────────────────
const explainOf = async (pipeline) => {
  const e = await Property.aggregate(pipeline).explain("executionStats");
  const cursor = e.stages?.[0]?.$geoNearCursor ?? e.stages?.[0]?.$cursor ?? e;
  const es = cursor.executionStats || {};
  return {
    keys: es.totalKeysExamined,
    docs: es.totalDocsExamined,
    nReturned: es.nReturned,
    ms: es.executionTimeMillis,
  };
};

console.log("\nserver-side work (executionStats from the $geoNear cursor):");
console.log(
  "  A/B (no limit pushdown):",
  JSON.stringify(
    await explainOf([
      geoNearStage(),
      { $facet: { data: [{ $skip: SKIP }, { $limit: LIMIT }], metadata: [{ $count: "total" }] } },
    ]),
  ),
);
console.log(
  "  D/E ($geoNear limit pushed down):",
  JSON.stringify(
    await explainOf([geoNearStage(), { $limit: SKIP + LIMIT }, { $skip: SKIP }]),
  ),
);

const countExplain = await Property.collection
  .aggregate([
    {
      $match: {
        ...filter,
        "address.location": {
          $geoWithin: { $centerSphere: [[LNG, LAT], RADIUS / EARTH_RADIUS_METERS] },
        },
      },
    },
    { $count: "total" },
  ])
  .explain("executionStats");
const ce = countExplain.stages?.[0]?.$cursor?.executionStats || countExplain.executionStats || {};
console.log(
  "  $geoWithin count:",
  JSON.stringify({
    keys: ce.totalKeysExamined,
    docs: ce.totalDocsExamined,
    nReturned: ce.nReturned,
    ms: ce.executionTimeMillis,
  }),
);

await mongoose.disconnect();
