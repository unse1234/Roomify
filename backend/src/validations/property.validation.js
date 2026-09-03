import { z } from "zod";
import {
  PROPERTY_TYPES,
  CURRENCIES,
} from "../models/property.model.js";

const optionalEnum = (values) =>
  z
    .string()
    .trim()
    .refine((v) => values.includes(v), { message: "Unsupported value" })
    .optional();

/**
 * GET /api/properties — the busiest and previously least-validated endpoint.
 * Caps the page size, restricts `sort` to an allowlist of indexed-friendly
 * fields (so `?sort=-description` can't force a 32MB in-memory sort), and
 * bounds every numeric filter. F-17.
 */
export const listPropertiesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),

  lng: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  radius: z.coerce.number().positive().max(200_000).default(10_000),

  type: optionalEnum(PROPERTY_TYPES),
  currency: optionalEnum(CURRENCIES),

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
