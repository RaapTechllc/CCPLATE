import { z } from "zod"

/**
 * Email validation schema
 * Validates standard email format
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .min(1, "Email is required")

/**
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")

/**
 * Pagination validation schema
 * - page: minimum 1, defaults to 1
 * - limit: between 1 and 100, defaults to 10
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(10),
})

/**
 * CUID validation schema
 * Validates CUID format (starts with 'c', followed by alphanumeric characters)
 */
export const idSchema = z
  .string()
  .min(1, "ID is required")
  .regex(/^c[a-z0-9]{24}$/, "Invalid ID format")

/**
 * Search query validation schema
 * - query: string with maximum length of 255 characters
 * - Trims whitespace automatically
 */
export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .max(255, "Search query cannot exceed 255 characters")
    .default(""),
})

// Type exports for TypeScript inference
export type Email = z.infer<typeof emailSchema>
export type Password = z.infer<typeof passwordSchema>
export type Pagination = z.infer<typeof paginationSchema>
export type Id = z.infer<typeof idSchema>
export type Search = z.infer<typeof searchSchema>
