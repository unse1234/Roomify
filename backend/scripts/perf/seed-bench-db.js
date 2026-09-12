import dotenv from "dotenv";
dotenv.config();

const { default: mongoose } = await import("mongoose");
const { default: Property, PROPERTY_TYPES, CURRENCIES, AMENITIES_LIST } =
  await import("../../src/models/property.model.js");

/**
 * Seeds an ISOLATED benchmark database so load tests can exercise the
 * property search against a realistic corpus without touching real data.
 *
 * The production database currently holds single-digit property documents,
 * which makes any load test of GET /api/properties a measurement of the
 * framework and the network — not of the query. This script builds a
 * separate database (default: <your db>_bench) on the same cluster so the
 * $geoNear pipeline can be measured at a size where its shape matters.
 *
 *   node scripts/perf/seed-bench-db.js [count]      # default 15000
 *   node scripts/perf/seed-bench-db.js --drop       # remove the bench db
 *
 * Point the API at it with:
 *   MONGO_URI="<same cluster>/<db>_bench?retryWrites=true&w=majority"
 *
 * Distribution matches scripts/benchmark-seed.js: 70% clustered within
 * ~30km of Islamabad, prices spread 1500-120000 so the 2000-5000 test band
 * is a real subset, ~15% non-active status.
 */

const ISLAMABAD = { lng: 73.0479, lat: 33.6844 };
const OTHER_CITIES = [
  { city: "Lahore", state: "Punjab", country: "Pakistan", lng: 74.3587, lat: 31.5204 },
  { city: "Karachi", state: "Sindh", country: "Pakistan", lng: 67.0011, lat: 24.8607 },
  { city: "Dubai", state: "Dubai", country: "UAE", lng: 55.2708, lat: 25.2048 },
];

const STATUSES_WEIGHTED = [
  "active", "active", "active", "active", "active", "active",
  "inactive", "under_review", "banned",
];

const BATCH_SIZE = 1000;

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const jitteredPoint = (lng, lat, spread) => [
  Number((lng + rand(-spread, spread)).toFixed(6)),
  Number((lat + rand(-spread, spread)).toFixed(6)),
];

const benchUri = () => {
  const raw = process.env.MONGO_URI;
  if (!raw) throw new Error("MONGO_URI is not set");
  const url = new URL(raw);
  const dbName = url.pathname.replace(/^\//, "") || "test";
  if (dbName.endsWith("_bench")) return raw;
  url.pathname = `/${dbName}_bench`;
  return url.toString();
};

const buildDoc = (i, hostIds) => {
  const nearIslamabad = Math.random() < 0.7;
  let city, state, country, coordinates;

  if (nearIslamabad) {
    city = "Islamabad";
    state = "Punjab";
    country = "Pakistan";
    coordinates = jitteredPoint(ISLAMABAD.lng, ISLAMABAD.lat, 0.27);
  } else {
    const c = pick(OTHER_CITIES);
    ({ city, state, country } = c);
    coordinates = jitteredPoint(c.lng, c.lat, 0.3);
  }

  const bedrooms = randInt(1, 6);
  const amenities = Array.from({ length: randInt(0, 5) }, () => pick(AMENITIES_LIST)).filter(
    (v, idx, arr) => arr.indexOf(v) === idx,
  );

  return {
    title: `Benchmark Listing #${i}`,
    description:
      "Synthetic listing generated for $geoNear + filter benchmarking. Not a real property.",
    host: pick(hostIds),
    type: pick(PROPERTY_TYPES),
    price: randInt(1500, 120000),
    currency: Math.random() < 0.88 ? "PKR" : pick(CURRENCIES),
    bedrooms,
    bathrooms: randInt(1, Math.max(1, bedrooms - 1) + 2),
    area: { value: randInt(300, 4000), unit: "sqft" },
    maxGuests: randInt(1, bedrooms * 2 + 2),
    images: [
      {
        url: `https://picsum.photos/seed/benchmark-${i}/800/600`,
        publicId: `benchmark_seed_${i}`,
      },
    ],
    amenities,
    address: {
      street: `Street ${i}`,
      city,
      state,
      country,
      zipCode: String(randInt(10000, 99999)),
      location: { type: "Point", coordinates },
    },
    status: pick(STATUSES_WEIGHTED),
    averageRating: Number(rand(0, 5).toFixed(1)),
    totalReviews: randInt(0, 200),
  };
};

const uri = benchUri();
await mongoose.connect(uri, { serverSelectionTimeoutMS: 15_000 });
console.log(`connected to benchmark db: ${mongoose.connection.db.databaseName}`);

if (process.argv.includes("--drop")) {
  await mongoose.connection.db.dropDatabase();
  console.log("benchmark database dropped");
  await mongoose.disconnect();
  process.exit(0);
}

const count = Number(process.argv[2]) || 15_000;
const hostIds = Array.from({ length: 25 }, () => new mongoose.Types.ObjectId());

await Property.collection.deleteMany({});
console.log(`inserting ${count} synthetic properties...`);

for (let start = 0; start < count; start += BATCH_SIZE) {
  const size = Math.min(BATCH_SIZE, count - start);
  const docs = Array.from({ length: size }, (_, j) => buildDoc(start + j, hostIds));
  await Property.insertMany(docs, { ordered: false });
  process.stdout.write(`  ${start + size}/${count}\r`);
}

console.log("\nbuilding indexes (same definitions as the real schema)...");
await Property.syncIndexes();

console.log(`done. properties: ${await Property.countDocuments({})}`);
console.log(`active: ${await Property.countDocuments({ status: "active" })}`);
await mongoose.disconnect();
