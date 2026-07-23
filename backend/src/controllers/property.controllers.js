// controllers/property.controller.js
import Property, {
  PROPERTY_TYPES,
  PROPERTY_STATUS,
} from "../models/property.model.js";
import {
  uploadImagesToImageKit,
  deleteImagesFromImageKit,
} from "../utils/imagekit.utils.js";
// ─── Helpers ──────────────────────────────────────────────────────────────────
const isOwnerOrAdmin = (property, user) => {
  return (
    property.host.toString() === user._id.toString() || user.hasRole("admin")
  );
};

// ─── @route   POST /api/properties
// ─── @access  Private (host only)

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

  // Parse JSON fields sent as strings
  const area = req.body.area ? JSON.parse(req.body.area) : undefined;

  const address = req.body.address
    ? JSON.parse(req.body.address)
    : undefined;

  const amenities = req.body.amenities
    ? JSON.parse(req.body.amenities)
    : [];

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
// ─── @route   GET /api/properties
// ─── @access  Public
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
  } = req.query;

  const filter = { status: "active" };

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
  let properties, total;

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

// ─── @route   GET /api/properties/:id
// ─── @access  Public
export const getPropertyById = async (req, res) => {
  const property = await Property.findById(req.params.id)
    .populate("host", "name email")
    .populate("reviews");

  if (!property) {
    return res.status(404).json({ message: "Property not found" });
  }

  res.status(200).json({ success: true, data: property });
};

// ─── @route   PATCH /api/properties/:id
// ─── @access  Private (owner host or admin)
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

  const disallowedFields = ["host", "averageRating", "totalReviews", "status"];
  disallowedFields.forEach((field) => delete req.body[field]);

  const updated = await Property.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  );

  res.status(200).json({ success: true, data: updated });
};

// ─── @route   PATCH /api/properties/:id/status
// ─── @access  Private (admin only)
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

// ─── @route   DELETE /api/properties/:id
// ─── @access  Private (owner host or admin)
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

  // TODO: Cloudinary image cleanup when integrated
  // property.images.forEach(img => cloudinary.uploader.destroy(img.publicId))

  res
    .status(200)
    .json({ success: true, message: "Property deleted successfully" });
};

// ─── @route   GET /api/properties/host/my-properties
// ─── @access  Private (host only)
export const getHostProperties = async (req, res) => {
  const properties = await Property.find({ host: req.user._id })
    .sort("-createdAt")
    .lean();

  res
    .status(200)
    .json({ success: true, count: properties.length, data: properties });
};
