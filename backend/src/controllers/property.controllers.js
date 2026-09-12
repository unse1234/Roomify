// controllers/property.controller.js
import { performance } from "node:perf_hooks";
import Property, {
  PROPERTY_TYPES,
  PROPERTY_STATUS,
} from "../models/property.model.js";
import User from "../models/users.model.js";
import {
  uploadImagesToImageKit,
  deleteImagesFromImageKit,
} from "../utils/imagekit.utils.js";
import { logger } from "../utils/logger.js";
import { startPerf } from "../utils/perf.js";

const isOwnerOrAdmin = (property, user) =>
  property.host.toString() === user._id.toString() || user.hasRole("admin");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Sphere radius MongoDB uses for spherical 2dsphere queries. $geoNear takes
// maxDistance in meters; $centerSphere takes a radius in radians, so the two
// only agree on the same set of documents if they are converted with this.
const EARTH_RADIUS_METERS = 6_378_100;

// Marker field on the row that carries the result count, so it can be told
// apart from property documents without relying on its position.
const TOTAL_FIELD = "__total";

const cleanupImages = (images, event, propertyId) => {
  if (!images?.length) return;

  deleteImagesFromImageKit(images).catch((error) => {
    logger.warn(event, {
      propertyId: propertyId?.toString(),
      errorName: error.name,
      errorMessage: error.message,
    });
  });
};

export const createProperty = async (req, res) => {
  // Validation (validate(createPropertySchema)) has already run, so a bad
  // payload is rejected here — before any image is uploaded and billed.
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "At least one image is required" });
  }

  const images = await uploadImagesToImageKit(req.files);

  try {
    const property = await Property.create({
      ...req.body,
      images,
      host: req.user._id,
    });

    res.status(201).json({ success: true, data: property });
  } catch (error) {
    cleanupImages(images, "property_image_upload_cleanup_failed", req.user._id);
    throw error;
  }
};

export const getAllProperties = async (req, res) => {
  // No-op object unless PERF_DIAGNOSTICS=true.
  const perf = startPerf();

  const {
    lng,
    lat,
    radius = 10000,
    type,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    maxGuests,
    amenities,
    currency,
    page = 1,
    limit = 12,
    sort = "-createdAt",
    q,
  } = req.query;

  const filter = { status: "active" };

  if (q?.trim()) {
    const search = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [
      { title: search },
      { "address.city": search },
      { "address.state": search },
      { "address.country": search },
    ];
  }

  if (type && PROPERTY_TYPES.includes(type)) filter.type = type;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };
  if (maxGuests) filter.maxGuests = { $gte: Number(maxGuests) };
  if (currency) filter.currency = currency;

  if (amenities) {
    const list = Array.isArray(amenities) ? amenities : amenities.split(",");
    filter.amenities = { $all: list };
  }

  const skip = (Number(page) - 1) * Number(limit);
  let properties;
  let total;

  perf.mark("filter-build");

  if (lng && lat) {
    // Why this is not a $facet:
    //
    // Inside a $facet the count branch consumes every match, so the planner
    // cannot push the page's $limit down into $geoNear — the stage has to
    // fetch and distance-rank every candidate inside the radius. Measured on
    // a 15k-property corpus (scripts/perf/compare-pipelines.js): 19,028
    // documents examined and ~76ms of server time to return 12 rows.
    //
    // With the page as its own stream the $limit *is* pushed into $geoNear,
    // which stops as soon as the page is full: 4,190 documents examined,
    // ~21ms. The count moves to a $geoWithin match, which answers from the
    // 2dsphere index without computing distances (386 examined, ~6ms).
    //
    // $unionWith keeps both in ONE round trip on ONE pooled connection.
    // Running them as two parallel queries is marginally faster in isolation
    // but doubles connection-hold time per request, which costs more than it
    // saves once the pool is the scarce resource.
    const center = [Number(lng), Number(lat)];
    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: center },
          distanceField: "distance",
          maxDistance: Number(radius),
          spherical: true,
          query: filter,
        },
      },
      // $geoNear already emits in ascending-distance order, so the page is
      // the first skip+limit rows; no separate $sort is needed.
      { $limit: skip + Number(limit) },
      { $skip: skip },
      {
        $unionWith: {
          coll: Property.collection.collectionName,
          pipeline: [
            {
              $match: {
                ...filter,
                "address.location": {
                  $geoWithin: {
                    $centerSphere: [center, Number(radius) / EARTH_RADIUS_METERS],
                  },
                },
              },
            },
            { $count: TOTAL_FIELD },
          ],
        },
      },
    ];

    const mongoStart = perf.enabled ? performance.now() : 0;
    const rows = await Property.aggregate(pipeline);
    if (perf.enabled) perf.recordMongo(performance.now() - mongoStart);
    perf.mark("mongodb");

    // $unionWith does not promise an output order, so the count row is found
    // by its marker field rather than its position, and the page is ordered
    // here. That sort is over at most `limit` rows, so it is free — unlike
    // the $sort it replaces, which the server applied to the whole match set.
    properties = rows
      .filter((row) => row[TOTAL_FIELD] === undefined)
      .sort((a, b) => a.distance - b.distance);
    total = rows.find((row) => row[TOTAL_FIELD] !== undefined)?.[TOTAL_FIELD] || 0;
  } else {
    [properties, total] = await Promise.all([
      Property.find(filter)
        .populate("host", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Property.countDocuments(filter),
    ]);
    perf.mark("mongodb");
  }

  const payload = {
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    count: properties.length,
    data: properties,
  };

  if (perf.enabled) return perf.send(res, payload);

  res.status(200).json(payload);
};

export const getPropertyById = async (req, res) => {
  // Reviews are intentionally NOT populated here: the `reviews` virtual has no
  // isVisible filter, so it would expose moderator-hidden reviews on this
  // public endpoint, and it is unbounded. The client reads reviews from the
  // paginated GET /api/reviews/property/:id endpoint, which filters correctly.
  const property = await Property.findById(req.params.id).populate(
    "host",
    "name email",
  );

  if (!property) {
    return res.status(404).json({ message: "Property not found" });
  }

  res.status(200).json({ success: true, data: property });
};

export const updateProperty = async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return res.status(404).json({ message: "Property not found" });
  }

  if (!isOwnerOrAdmin(property, req.user)) {
    return res
      .status(403)
      .json({ message: "Not authorized to update this property" });
  }

  // req.body is the validated, allowlisted update — unknown keys (host,
  // status, bookingLockToken, ...) were stripped by the schema.
  const update = { ...req.body };
  let replacementImages = null;

  if (req.files?.length) {
    replacementImages = await uploadImagesToImageKit(req.files);
    update.images = replacementImages;
  }

  const updated = await Property.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true },
  );

  if (replacementImages) {
    cleanupImages(
      property.images,
      "property_old_image_cleanup_failed",
      property._id,
    );
  }

  res.status(200).json({ success: true, data: updated });
};

export const updatePropertyStatus = async (req, res) => {
  const { status } = req.body;

  if (!PROPERTY_STATUS.includes(status)) {
    return res.status(400).json({
      message: `Invalid status. Must be one of: ${PROPERTY_STATUS.join(", ")}`,
    });
  }

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { $set: { status } },
    { new: true },
  );

  if (!property) {
    return res.status(404).json({ message: "Property not found" });
  }

  res.status(200).json({ success: true, data: property });
};

export const deleteProperty = async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return res.status(404).json({ message: "Property not found" });
  }

  if (!isOwnerOrAdmin(property, req.user)) {
    return res
      .status(403)
      .json({ message: "Not authorized to delete this property" });
  }

  await property.deleteOne();
  cleanupImages(property.images, "property_image_cleanup_failed", property._id);

  res
    .status(200)
    .json({ success: true, message: "Property deleted successfully" });
};

export const getHostProperties = async (req, res) => {
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;

  const [properties, total] = await Promise.all([
    Property.find({ host: req.user._id })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Property.countDocuments({ host: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    count: properties.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data: properties,
  });
};

export const getWishlist = async (req, res) => {
  const { page, limit } = req.query;

  const user = await User.findById(req.user._id)
    .populate({
      path: "wishlist",
      match: { status: "active" },
      populate: { path: "host", select: "name email" },
      options: { sort: { createdAt: -1 }, skip: (page - 1) * limit, limit },
    })
    .lean();

  const wishlist = user?.wishlist || [];

  res.status(200).json({
    success: true,
    count: wishlist.length,
    page,
    data: wishlist,
  });
};

// PUT /api/properties/:id/wishlist — idempotent add.
export const addToWishlist = async (req, res) => {
  const property = await Property.findById(req.params.id)
    .select("_id status")
    .lean();

  if (!property || property.status !== "active") {
    return res.status(404).json({ message: "Property not found" });
  }

  // $addToSet is atomic and a no-op if the id is already present, so a
  // retried request cannot double-add and two concurrent requests cannot
  // lose an update.
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { wishlist: property._id } },
    { new: true, select: "wishlist" },
  );

  res.status(200).json({
    success: true,
    wishlisted: true,
    data: user.wishlist,
  });
};

// DELETE /api/properties/:id/wishlist — idempotent remove.
export const removeFromWishlist = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { wishlist: req.params.id } },
    { new: true, select: "wishlist" },
  );

  res.status(200).json({
    success: true,
    wishlisted: false,
    data: user.wishlist,
  });
};
