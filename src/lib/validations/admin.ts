import { z } from "zod";

// User list query validation
export const userListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["active", "deleted"]).optional(),
  sortBy: z
    .enum(["createdAt", "name", "email", "lastLoginAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// User update validation
export const userUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  image: z.string().url().optional().nullable(),
});

// User ID validation
export const userIdSchema = z.object({
  id: z.string().regex(/^c[a-z0-9]{24}$/, "Invalid user ID"),
});

// Setting update validation
export const settingUpdateSchema = z.object({
  value: z.string(),
  type: z.enum(["STRING", "NUMBER", "BOOLEAN", "JSON"]).optional(),
});

// Bulk settings update validation
export const bulkSettingsUpdateSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string(),
    type: z.enum(["STRING", "NUMBER", "BOOLEAN", "JSON"]).optional(),
  })
);

// Setting key validation
export const settingKeySchema = z.object({
  key: z.string().min(1).max(100),
});

// Impersonation validation
export const impersonateSchema = z.object({
  userId: z.string().regex(/^c[a-z0-9]{24}$/, "Invalid user ID"),
});

// Types
export type UserListQueryInput = z.infer<typeof userListQuerySchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type SettingUpdateInput = z.infer<typeof settingUpdateSchema>;
export type BulkSettingsUpdateInput = z.infer<typeof bulkSettingsUpdateSchema>;
