/**
 * Storage Adapter Types
 * Defines interfaces for file storage operations
 */

/**
 * Result returned from storage operations
 */
export interface StorageResult {
  /** Generated filename (unique identifier) */
  filename: string;
  /** Public URL to access the file */
  url: string;
  /** File size in bytes */
  size: number;
}

/**
 * Options for upload operations
 */
export interface UploadOptions {
  /** Content type/MIME type of the file */
  contentType?: string;
  /** Custom metadata to attach to the file */
  metadata?: Record<string, string>;
  /** Cache control header value */
  cacheControl?: string;
  /** Whether the file should be publicly accessible */
  isPublic?: boolean;
}

/**
 * Storage adapter interface for file operations
 * Implement this interface to create custom storage backends
 */
export interface StorageAdapter {
  /**
   * Upload a file to storage
   * @param file - File buffer to upload
   * @param filename - Target filename in storage
   * @param mimeType - MIME type of the file
   * @param options - Additional upload options
   * @returns Storage result with filename, URL, and size
   */
  upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult>;

  /**
   * Delete a file from storage
   * @param filename - Filename to delete
   */
  delete(filename: string): Promise<void>;

  /**
   * Get the public URL for a file
   * @param filename - Filename to get URL for
   * @returns Public URL string
   */
  getUrl(filename: string): string;

  /**
   * Check if a file exists in storage
   * @param filename - Filename to check
   * @returns True if file exists, false otherwise
   */
  exists(filename: string): Promise<boolean>;
}

/**
 * Base storage configuration
 */
export interface BaseStorageConfig {
  /** Type of storage adapter */
  type: "LOCAL" | "S3" | "R2";
}

/**
 * Local storage configuration
 */
export interface LocalStorageConfig extends BaseStorageConfig {
  type: "LOCAL";
  /** Directory path for file storage */
  uploadDir: string;
  /** Base URL for serving files */
  baseUrl: string;
}

/**
 * S3 storage configuration
 */
export interface S3StorageConfig extends BaseStorageConfig {
  type: "S3";
  /** S3 bucket name */
  bucket: string;
  /** AWS region */
  region: string;
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** Optional custom endpoint (for S3-compatible services) */
  endpoint?: string;
  /** Whether to force path-style URLs */
  forcePathStyle?: boolean;
}

/**
 * Cloudflare R2 storage configuration
 */
export interface R2StorageConfig extends BaseStorageConfig {
  type: "R2";
  /** R2 bucket name */
  bucket: string;
  /** Cloudflare account ID */
  accountId: string;
  /** R2 access key ID */
  accessKeyId: string;
  /** R2 secret access key */
  secretAccessKey: string;
  /** Public bucket URL (for custom domains) */
  publicUrl?: string;
}

/**
 * Union type for all storage configurations
 */
export type StorageConfig = LocalStorageConfig | S3StorageConfig | R2StorageConfig;

/**
 * Storage error class for handling storage-specific errors
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "StorageError";
  }
}
