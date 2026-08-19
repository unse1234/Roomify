// controllers/property.controller.js
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

const isOwnerOrAdmin = (property, user) => (
  property.host.toString() === user._id.toString() || user.hasRole("admin")
);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;
  return JSON.parse(value);
};

const buildPropertyUpdate = (body) => {
  const update = { ...body };
  ["host", "averageRating", "totalReviews", "status", "images"].forEach((field) => delete update[field]);

  if (update.area) update.area = parseMaybeJson(update.area);
  if (update.address) update.address = parseMaybeJson(update.address);
  if (update.amenities) update.amenities = parseMaybeJson(update.amenities);

  return update;
};

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
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "At least one image is required" });
  }

  const images = await uploadImagesToImageKit(req.files);

  const {
    title,
    description,
    type,
    price,
    currency,
    bedrooms,
    bathrooms,
    maxGuests,
  } = req.body;

  const area = req.body.area ? JSON.parse(req.body.area) : undefined;
  const address = req.body.address ? JSON.parse(req.body.address) : undefined;
  const amenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];

  const property = await Property.create({
    title,
    description,
    type,
    price,
    currency,
    bedrooms,
    bathrooms,
    area,
    maxGuests,
    amenities,
    address,
    images,
    host: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: property,
  });
};

export const getAllProperties = async (req, res) => {
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

  if (lng && lat) {
    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
          distanceField: "distance",
          maxDistance: Number(radius),
          spherical: true,
          query: filter,
        },
      },
      { $sort: { distance: 1 } },
      { $skip: skip },
      { $limit: Number(limit) },
    ];

    properties = await Property.aggregate(pipeline);
    total = properties.length;
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
  }

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    count: properties.length,
    data: properties,
  });
};

export const getPropertyById = async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate("host", "name email")
    .populate("reviews");

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
    return res.status(403).json({ message: "Not authorized to update this property" });
  }

  const update = buildPropertyUpdate(req.body);
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
    cleanupImages(property.images, "property_old_image_cleanup_failed", property._id);
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
    return res.status(403).json({ message: "Not authorized to delete this property" });
  }

  await property.deleteOne();
  cleanupImages(property.images, "property_image_cleanup_failed", property._id);

  res.status(200).json({ success: true, message: "Property deleted successfully" });
};

export const getHostProperties = async (req, res) => {
  const properties = await Property.find({ host: req.user._id })
    .sort("-createdAt")
    .lean();

  res.status(200).json({ success: true, count: properties.length, data: properties });
};

export const getWishlist = async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: "wishlist",
      match: { status: "active" },
      populate: { path: "host", select: "name email" },
    })
    .lean();

  const wishlist = user?.wishlist || [];

  res.status(200).json({
    success: true,
    count: wishlist.length,
    data: wishlist,
  });
};

export const toggleWishlist = async (req, res) => {
  const property = await Property.findById(req.params.id).select("_id status").lean();

  if (!property || property.status !== "active") {
    return res.status(404).json({ message: "Property not found" });
  }

  const user = await User.findById(req.user._id).select("wishlist");
  const propertyId = property._id.toString();
  const exists = user.wishlist.some((id) => id.toString() === propertyId);

  if (exists) {
    user.wishlist = user.wishlist.filter((id) => id.toString() !== propertyId);
  } else {
    user.wishlist.push(property._id);
  }

  await user.save();

  res.status(200).json({
    success: true,
    wishlisted: !exists,
    data: user.wishlist,
  });
};