import { z } from "zod";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_AVATAR_SIZE,
} from "@/types/file";

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.enum(ALLOWED_FILE_TYPES as unknown as [string, ...string[]], {
    errorMap: () => ({ message: "File type not allowed" }),
  }),
  size: z
    .number()
    .positive()
    .max(MAX_FILE_SIZE, `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`),
});

// Avatar upload validation (more restrictive)
export const avatarUploadSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    errorMap: () => ({ message: "Avatar must be JPEG, PNG, or WebP" }),
  }),
  size: z
    .number()
    .positive()
    .max(MAX_AVATAR_SIZE, `Avatar must be less than ${MAX_AVATAR_SIZE / 1024 / 1024}MB`),
});

// File list query validation
export const fileListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  mimeType: z.string().optional(),
});

// File ID validation
export const fileIdSchema = z.object({
  id: z.string().cuid("Invalid file ID"),
});

// Types
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;
export type FileListQueryInput = z.infer<typeof fileListQuerySchema>;
