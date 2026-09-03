import { z } from "zod";
import {
  PROPERTY_TYPES,
  CURRENCIES,
  AMENITIES_LIST,
} from "../models/property.model.js";

const enumOf = (values, label = "value") =>
  z
    .string()
    .trim()
    .refine((v) => values.includes(v), { message: `Unsupported ${label}` });

const optionalEnum = (values, label) => enumOf(values, label).optional();

/**
 * Multipart form fields arrive as strings; the create/update form JSON-encodes
 * `area`, `address` and `amenities`. Parse them here so a malformed value
 * becomes a 422 with a field path instead of an unhandled SyntaxError -> 500
 * (which currently happens AFTER images are billed to ImageKit).
 */
const jsonField = (inner) =>
  z.preprocess((val) => {
    if (typeof val !== "string") return val;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }, inner);

const blankableString = (max) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const areaSchema = z.object({
  value: z.coerce.number().min(0).max(1_000_000),
  unit: z.enum(["sqft", "sqm"]).default("sqft"),
});

const addressSchema = z.object({
  street: blankableString(200),
  city: z.string().trim().min(1, "City is required").max(120),
  state: blankableString(120),
  country: z.string().trim().min(1, "Country is required").max(120),
  zipCode: blankableString(20),
  location: z.object({
    type: z.literal("Point").default("Point"),
    coordinates: z.tuple([
      z.coerce.number().min(-180).max(180),
      z.coerce.number().min(-90).max(90),
    ]),
  }),
});

const amenitiesSchema = jsonField(z.array(enumOf(AMENITIES_LIST, "amenity")));

// Unknown keys (host, status, images, bookingLockToken, createdAt, ...) are
// stripped by zod object parsing — this is the allowlist that replaces the
// old blocklist and closes the mass-assignment hole (F-11).
export const createPropertySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(2000),
  type: enumOf(PROPERTY_TYPES, "property type"),
  price: z.coerce.number().min(0).max(100_000_000),
  currency: optionalEnum(CURRENCIES, "currency").default("PKR"),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  maxGuests: z.coerce.number().int().min(1).max(100),
  area: jsonField(areaSchema).optional(),
  amenities: amenitiesSchema.optional().default([]),
  address: jsonField(addressSchema),
});

// No "at least one field" refine: an image-only update legitimately sends an
// empty body (the files travel outside it).
export const updatePropertySchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  type: optionalEnum(PROPERTY_TYPES, "property type"),
  price: z.coerce.number().min(0).max(100_000_000).optional(),
  currency: optionalEnum(CURRENCIES, "currency"),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  maxGuests: z.coerce.number().int().min(1).max(100).optional(),
  area: jsonField(areaSchema).optional(),
  amenities: amenitiesSchema.optional(),
  address: jsonField(addressSchema).optional(),
});

// Generic page/limit for the previously-unbounded list endpoints (F-16).
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listPropertiesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),

  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  radius: z.coerce.number().positive().max(200_000).default(10_000),

  type: optionalEnum(PROPERTY_TYPES, "property type"),
  currency: optionalEnum(CURRENCIES, "currency"),

  minPrice: z.coerce.number().min(0).max(100_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(100_000_000).optional(),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
  bathrooms: z.coerce.number().int().min(0).max(50).optional(),
  maxGuests: z.coerce.number().int().min(1).max(100).optional(),

  amenities: z.union([z.string(), z.array(z.string())]).optional(),

  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  sort: z
    .enum(["-createdAt", "createdAt", "price", "-price", "-averageRating"])
    .default("-createdAt"),
});
