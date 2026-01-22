// Allowed MIME types for uploads
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
] as const;

export type AllowedMimeType = (typeof ALLOWED_FILE_TYPES)[number];

// File size limits (in bytes)
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

// Storage types
export type StorageType = "LOCAL" | "S3" | "R2";

// File response from API
export interface FileResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageType: StorageType;
  createdAt: string;
}

// Upload options
export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
}

// File list query
export interface FileListQuery {
  page?: number;
  limit?: number;
  mimeType?: string;
}

// Paginated file response
export interface PaginatedFiles {
  files: FileResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Storage result from adapter
export interface StorageResult {
  filename: string;
  url: string;
  size: number;
}

// Storage adapter interface
export interface StorageAdapter {
  upload(
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageResult>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
  exists(filename: string): Promise<boolean>;
}
