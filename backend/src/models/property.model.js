
// models/property.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// ─── Enums (single source of truth — import wherever needed) ───────────────
export const PROPERTY_TYPES = ['apartment', 'house', 'villa', 'cabin', 'cottage', 'studio', 'farmhouse', 'other'];
export const PROPERTY_STATUS = ['active', 'inactive', 'under_review', 'banned'];
export const CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP'];
export const AMENITIES_LIST = [
  'wifi', 'parking', 'kitchen', 'air_conditioning', 'heating',
  'washer', 'dryer', 'tv', 'pool', 'gym', 'fireplace',
  'workspace', 'pet_friendly', 'smoking_allowed',
];

// ─── Sub-schemas ────────────────────────────────────────────────────────────
const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // Cloudinary public_id (for deletion)
  },
  { _id: false } // no separate _id per image — not needed
);

// GeoJSON Point — enables MongoDB 2dsphere geospatial queries
const locationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude] — GeoJSON order (NOT lat/lng)
      required: true,
    },
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    street:   { type: String, trim: true },
    city:     { type: String, trim: true, required: true },
    state:    { type: String, trim: true },
    country:  { type: String, trim: true, required: true },
    zipCode:  { type: String, trim: true },
    location: { type: locationSchema, required: true }, // geospatial point
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────
const propertySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    host: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host is required'],
    },
    type: {
      type: String,
      enum: PROPERTY_TYPES,
      required: [true, 'Property type is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      enum: CURRENCIES,
      default: 'PKR',
    },
    bedrooms: {
      type: Number,
      required: true,
      min: [0, 'Bedrooms cannot be negative'],
    },
    bathrooms: {
      type: Number,
      required: true,
      min: [0, 'Bathrooms cannot be negative'],
    },
    area: {
      value: { type: Number, min: 0 }, // e.g. 1200
      unit:  { type: String, enum: ['sqft', 'sqm'], default: 'sqft' },
    },
    maxGuests: {
      type: Number,
      required: true,
      min: [1, 'Must allow at least 1 guest'],
    },
    images: {
      type: [imageSchema],
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 10,
        message: 'Property must have between 1 and 10 images',
      },
    },
    amenities: [
      {
        type: String,
        enum: AMENITIES_LIST,
      },
    ],
    address: {
      type: addressSchema,
      required: true,
    },
    status: {
      type: String,
      enum: PROPERTY_STATUS,
      default: 'active',
    },

    // ── Denormalized review stats (updated when reviews are added/removed) ──
    // Avoids expensive aggregation on every listing fetch
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews:  { type: Number, default: 0 },
  },
  {
    timestamps: true, // auto createdAt + updatedAt
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
propertySchema.index({ 'address.location': '2dsphere' }); // geospatial search
propertySchema.index({ price: 1 });                        // price range filter
propertySchema.index({ status: 1 });                       // active listings filter
propertySchema.index({ host: 1 });                        // host's own listings
propertySchema.index({ type: 1, status: 1 });              // compound — browse by type

// ─── Virtuals ────────────────────────────────────────────────────────────────
// Future: reviews will be populated via this virtual
propertySchema.virtual('reviews', {
  ref:          'Review',
  localField:   '_id',
  foreignField: 'property',
});

export default mongoose.model('Property', propertySchema);