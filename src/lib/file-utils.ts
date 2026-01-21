/**
 * File Utility Functions
 * Helper functions for file operations, validation, and formatting
 */

import { randomUUID } from "crypto";

/**
 * Generate a unique filename using crypto.randomUUID
 * Preserves the original file extension
 *
 * @param originalName - Original filename with extension
 * @returns Unique filename with UUID prefix
 *
 * @example
 * ```ts
 * generateUniqueFilename("photo.jpg")
 * // Returns: "550e8400-e29b-41d4-a716-446655440000-photo.jpg"
 * ```
 */
export function generateUniqueFilename(originalName: string): string {
  const uuid = randomUUID();
  const sanitized = sanitizeFilename(originalName);
  return `${uuid}-${sanitized}`;
}

/**
 * Generate a unique filename with timestamp
 * Alternative format: timestamp-uuid-name
 *
 * @param originalName - Original filename with extension
 * @returns Unique filename with timestamp and UUID
 */
export function generateTimestampedFilename(originalName: string): string {
  const uuid = randomUUID().split("-")[0]; // Short UUID
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(originalName);
  return `${timestamp}-${uuid}-${sanitized}`;
}

/**
 * Validate file type against allowed MIME types
 *
 * @param mimeType - MIME type to validate
 * @param allowed - Array of allowed MIME types
 * @returns True if MIME type is allowed
 *
 * @example
 * ```ts
 * validateFileType("image/jpeg", ["image/jpeg", "image/png"])
 * // Returns: true
 *
 * validateFileType("application/exe", ["image/jpeg", "image/png"])
 * // Returns: false
 * ```
 */
export function validateFileType(mimeType: string, allowed: string[]): boolean {
  if (!mimeType || !allowed || allowed.length === 0) {
    return false;
  }

  const normalizedMimeType = mimeType.toLowerCase().trim();
  return allowed.some((type) => type.toLowerCase().trim() === normalizedMimeType);
}

/**
 * Validate file type using wildcard patterns
 * Supports patterns like "image/*" or "application/*"
 *
 * @param mimeType - MIME type to validate
 * @param patterns - Array of allowed patterns (can include wildcards)
 * @returns True if MIME type matches any pattern
 *
 * @example
 * ```ts
 * validateFileTypePattern("image/jpeg", ["image/*"])
 * // Returns: true
 * ```
 */
export function validateFileTypePattern(mimeType: string, patterns: string[]): boolean {
  if (!mimeType || !patterns || patterns.length === 0) {
    return false;
  }

  const normalizedMimeType = mimeType.toLowerCase().trim();
  const [typeGroup] = normalizedMimeType.split("/");

  return patterns.some((pattern) => {
    const normalizedPattern = pattern.toLowerCase().trim();

    // Exact match
    if (normalizedPattern === normalizedMimeType) {
      return true;
    }

    // Wildcard match (e.g., "image/*")
    if (normalizedPattern.endsWith("/*")) {
      const patternGroup = normalizedPattern.slice(0, -2);
      return typeGroup === patternGroup;
    }

    return false;
  });
}

/**
 * Validate file size against maximum allowed size
 *
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns True if file size is within limit
 *
 * @example
 * ```ts
 * validateFileSize(1024 * 1024, 5 * 1024 * 1024) // 1MB vs 5MB limit
 * // Returns: true
 * ```
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  if (typeof size !== "number" || typeof maxSize !== "number") {
    return false;
  }
  return size > 0 && size <= maxSize;
}

/**
 * Sanitize filename by removing special characters
 * Keeps alphanumeric, dots, dashes, and underscores
 *
 * @param filename - Original filename to sanitize
 * @returns Sanitized filename safe for filesystem
 *
 * @example
 * ```ts
 * sanitizeFilename("My File (1).jpg")
 * // Returns: "My-File-1.jpg"
 *
 * sanitizeFilename("../../etc/passwd")
 * // Returns: "etc-passwd"
 * ```
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "unnamed";
  }

  return (
    filename
      // Remove path traversal attempts
      .replace(/\.\./g, "")
      // Replace path separators
      .replace(/[/\\]/g, "-")
      // Remove null bytes and control characters
      .replace(/[\x00-\x1f\x7f]/g, "")
      // Replace spaces and special chars with dashes
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      // Collapse multiple dashes
      .replace(/-+/g, "-")
      // Remove leading/trailing dashes
      .replace(/^-+|-+$/g, "")
      // Limit length
      .slice(0, 255) || "unnamed"
  );
}

/**
 * Get file extension from filename
 *
 * @param filename - Filename to extract extension from
 * @returns File extension without dot, lowercase
 *
 * @example
 * ```ts
 * getFileExtension("photo.JPG")
 * // Returns: "jpg"
 *
 * getFileExtension("document.tar.gz")
 * // Returns: "gz"
 * ```
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) {
    return "";
  }

  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Get full file extension for multi-part extensions
 *
 * @param filename - Filename to extract extension from
 * @returns Full extension (e.g., "tar.gz")
 */
export function getFullExtension(filename: string): string {
  if (!filename || typeof filename !== "string") {
    return "";
  }

  const parts = filename.split(".");
  if (parts.length <= 1) {
    return "";
  }

  // Common compound extensions
  const compoundExtensions = ["tar.gz", "tar.bz2", "tar.xz"];
  const lastTwo = parts.slice(-2).join(".").toLowerCase();

  if (compoundExtensions.includes(lastTwo)) {
    return lastTwo;
  }

  return parts[parts.length - 1].toLowerCase();
}

/**
 * Format file size to human-readable string
 *
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Human-readable file size string
 *
 * @example
 * ```ts
 * formatFileSize(1024)
 * // Returns: "1 KB"
 *
 * formatFileSize(1536000)
 * // Returns: "1.46 MB"
 *
 * formatFileSize(0)
 * // Returns: "0 Bytes"
 * ```
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  if (typeof bytes !== "number" || bytes < 0) return "Invalid size";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}

/**
 * Parse file size string to bytes
 *
 * @param sizeString - Human-readable size (e.g., "5MB", "1.5 GB")
 * @returns Size in bytes
 *
 * @example
 * ```ts
 * parseFileSize("5MB")
 * // Returns: 5242880
 *
 * parseFileSize("1.5 GB")
 * // Returns: 1610612736
 * ```
 */
export function parseFileSize(sizeString: string): number {
  if (!sizeString || typeof sizeString !== "string") {
    return 0;
  }

  const units: Record<string, number> = {
    b: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  const match = sizeString.trim().match(/^([\d.]+)\s*([a-zA-Z]+)$/);
  if (!match) {
    return parseInt(sizeString, 10) || 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = units[unit] || 1;

  return Math.floor(value * multiplier);
}

/**
 * Get MIME type from file extension
 * Common MIME type lookup
 *
 * @param extension - File extension (with or without dot)
 * @returns MIME type or "application/octet-stream" if unknown
 */
export function getMimeType(extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",

    // Documents
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    // Text
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",

    // Archives
    zip: "application/zip",
    rar: "application/vnd.rar",
    tar: "application/x-tar",
    gz: "application/gzip",

    // Media
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Check if a MIME type represents an image
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType?.startsWith("image/") || false;
}

/**
 * Check if a MIME type represents a video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType?.startsWith("video/") || false;
}

/**
 * Check if a MIME type represents audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType?.startsWith("audio/") || false;
}

/**
 * Check if a MIME type represents a document
 */
export function isDocumentMimeType(mimeType: string): boolean {
  const documentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument",
    "text/plain",
    "text/csv",
  ];

  return documentTypes.some((type) => mimeType?.startsWith(type)) || false;
}
