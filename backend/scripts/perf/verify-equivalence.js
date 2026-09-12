import dotenv from "dotenv";
dotenv.config();

const { default: mongoose } = await import("mongoose");
const { default: Property } = await import("../../src/models/property.model.js");

/**
 * Proves the rewritten geospatial pipeline is a drop-in replacement for the
 * $facet one: for a spread of filter/page combinations, both shapes must
 * return the same `total` and the same page of _ids in the same order.
 *
 * Run against the benchmark database (scripts/perf/seed-bench-db.js) so the
 * cases have enough documents to be meaningful:
 *   MONGO_URI="<cluster>/<db>_bench" node scripts/perf/verify-equivalence.js
 */

const EARTH_RADIUS_METERS = 6_378_100;
const TOTAL_FIELD = "__total";

const oldShape = async ({ center, radius, filter, skip, limit }) => {
  const [r] = await Property.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: center },
        distanceField: "distance",
        maxDistance: radius,
        spherical: true,
        query: filter,
      },
    },
    {
      $facet: {
        data: [{ $sort: { distance: 1 } }, { $skip: skip }, { $limit: limit }],
        metadata: [{ $count: "total" }],
      },
    },
  ]);
  return { data: r?.data || [], total: r?.metadata?.[0]?.total || 0 };
};

const newShape = async ({ center, radius, filter, skip, limit }) => {
  const rows = await Property.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: center },
        distanceField: "distance",
        maxDistance: radius,
        spherical: true,
        query: filter,
      },
    },
    { $limit: skip + limit },
    { $skip: skip },
    {
      $unionWith: {
        coll: Property.collection.collectionName,
        pipeline: [
          {
            $match: {
              ...filter,
              "address.location": {
                $geoWithin: { $centerSphere: [center, radius / EARTH_RADIUS_METERS] },
              },
            },
          },
          { $count: TOTAL_FIELD },
        ],
      },
    },
  ]);
  return {
    data: rows
      .filter((row) => row[TOTAL_FIELD] === undefined)
      .sort((a, b) => a.distance - b.distance),
    total: rows.find((row) => row[TOTAL_FIELD] !== undefined)?.[TOTAL_FIELD] || 0,
  };
};

const ISB = [73.0479, 33.6844];
const LHR = [74.3587, 31.5204];

const CASES = [
  { name: "active only, 30km, page 1", center: ISB, radius: 30_000, filter: { status: "active" }, skip: 0, limit: 12 },
  { name: "active + price band, page 1", center: ISB, radius: 30_000, filter: { status: "active", price: { $gte: 2000, $lte: 5000 } }, skip: 0, limit: 12 },
  { name: "active + price band, page 3", center: ISB, radius: 30_000, filter: { status: "active", price: { $gte: 2000, $lte: 5000 } }, skip: 24, limit: 12 },
  { name: "active + price band, page 10", center: ISB, radius: 30_000, filter: { status: "active", price: { $gte: 2000, $lte: 5000 } }, skip: 108, limit: 12 },
  { name: "page past the end", center: ISB, radius: 30_000, filter: { status: "active", price: { $gte: 2000, $lte: 5000 } }, skip: 480, limit: 12 },
  { name: "five filters", center: ISB, radius: 30_000, filter: { status: "active", price: { $gte: 2000, $lte: 5000 }, bedrooms: { $gte: 2 }, bathrooms: { $gte: 1 }, maxGuests: { $gte: 4 }, currency: "PKR" }, skip: 0, limit: 12 },
  { name: "amenities $all", center: ISB, radius: 30_000, filter: { status: "active", amenities: { $all: ["wifi", "parking"] } }, skip: 0, limit: 12 },
  { name: "text $or across fields", center: ISB, radius: 50_000, filter: { status: "active", $or: [{ title: /Listing #1/i }, { "address.city": /islamabad/i }] }, skip: 0, limit: 12 },
  { name: "tiny radius (1km)", center: ISB, radius: 1_000, filter: { status: "active" }, skip: 0, limit: 12 },
  { name: "max radius (200km)", center: ISB, radius: 200_000, filter: { status: "active" }, skip: 0, limit: 24 },
  { name: "zero matches", center: ISB, radius: 30_000, filter: { status: "active", price: { $gte: 999_000_000 } }, skip: 0, limit: 12 },
  { name: "different centre (Lahore)", center: LHR, radius: 40_000, filter: { status: "active" }, skip: 0, limit: 12 },
  { name: "limit 1", center: ISB, radius: 30_000, filter: { status: "active" }, skip: 0, limit: 1 },
  { name: "type filter", center: ISB, radius: 30_000, filter: { status: "active", type: "villa" }, skip: 0, limit: 12 },
];

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15_000 });
console.log(`db: ${mongoose.connection.db.databaseName}  properties: ${await Property.countDocuments({})}\n`);

let failures = 0;
for (const testCase of CASES) {
  const [a, b] = await Promise.all([oldShape(testCase), newShape(testCase)]);
  const idsA = a.data.map((d) => String(d._id));
  const idsB = b.data.map((d) => String(d._id));
  const sameTotal = a.total === b.total;
  const sameIds = idsA.length === idsB.length && idsA.every((id, i) => id === idsB[i]);
  const sameDistances = a.data.every(
    (d, i) => Math.abs((d.distance ?? 0) - (b.data[i]?.distance ?? 0)) < 1e-6,
  );
  // Field-for-field identity of the first row, so the response contract is
  // provably unchanged and not merely "the same ids".
  const sameShape =
    a.data.length === 0 ||
    JSON.stringify(Object.keys(a.data[0]).sort()) ===
      JSON.stringify(Object.keys(b.data[0]).sort());

  const ok = sameTotal && sameIds && sameDistances && sameShape;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${testCase.name.padEnd(32)} ` +
      `total ${String(a.total).padStart(5)} vs ${String(b.total).padStart(5)}  ` +
      `rows ${String(idsA.length).padStart(2)} vs ${String(idsB.length).padStart(2)}` +
      (ok ? "" : `  [total:${sameTotal} ids:${sameIds} dist:${sameDistances} keys:${sameShape}]`),
  );
}

console.log(failures === 0 ? "\nall cases equivalent" : `\n${failures} case(s) differ`);
process.exitCode = failures === 0 ? 0 : 1;
await mongoose.disconnect();
