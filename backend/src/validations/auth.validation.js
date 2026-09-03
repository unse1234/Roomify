import { z } from "zod";

const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

// Mirrors the client-side rules in Register.jsx exactly.
const password = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[0-9]/, "Password needs a number");

export const registerSchema = z.object({
  name: z.string({ error: "Name is required" }).trim().min(2, "Name is too short").max(80),
  email,
  password,
  roles: z.array(z.enum(["guest", "host"])).max(2).optional(),
});

export const loginSchema = z.object({
  // Login only checks presence — a legacy short password must still be able
  // to sign in (existing accounts are grandfathered; F-12).
  email: z.string({ error: "Email is required" }).trim().toLowerCase().email("Enter a valid email address"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(128),
});
