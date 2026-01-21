/**
 * Storage Module
 * Factory functions and exports for file storage adapters
 */

// Export types
export type {
  StorageAdapter,
  StorageResult,
  StorageConfig,
  LocalStorageConfig,
  S3StorageConfig,
  R2StorageConfig,
  UploadOptions,
} from "./types";

export { StorageError } from "./types";

// Export adapters
export { LocalStorageAdapter, createLocalAdapter } from "./local-adapter";
export { S3StorageAdapter, createS3Adapter, createR2Adapter } from "./s3-adapter";

// Export config
export { getStorageConfig, getStorageType } from "./config";
export type { StorageType } from "./config";

// Import for factory function
import type { StorageAdapter, LocalStorageConfig, S3StorageConfig, R2StorageConfig } from "./types";
import { LocalStorageAdapter } from "./local-adapter";
import { S3StorageAdapter } from "./s3-adapter";
import { getStorageConfig } from "./config";

// Singleton instance cache
let storageAdapterInstance: StorageAdapter | null = null;

/**
 * Get the storage adapter based on environment configuration
 * Returns a singleton instance for efficiency
 *
 * @returns StorageAdapter instance based on STORAGE_TYPE environment variable
 * @throws Error if configuration is invalid
 *
 * @example
 * ```ts
 * const storage = getStorageAdapter();
 * await storage.upload(fileBuffer, "my-file.jpg", "image/jpeg");
 * ```
 */
export function getStorageAdapter(): StorageAdapter {
  if (storageAdapterInstance) {
    return storageAdapterInstance;
  }

  const config = getStorageConfig();

  switch (config.type) {
    case "LOCAL":
      storageAdapterInstance = new LocalStorageAdapter(config as LocalStorageConfig);
      break;
    case "S3":
      storageAdapterInstance = new S3StorageAdapter(config as S3StorageConfig);
      break;
    case "R2":
      storageAdapterInstance = new S3StorageAdapter(config as R2StorageConfig);
      break;
    default:
      throw new Error(`Unknown storage type: ${(config as { type: string }).type}`);
  }

  return storageAdapterInstance;
}

/**
 * Create a new storage adapter instance (non-singleton)
 * Use this when you need multiple adapters or custom configuration
 *
 * @param config - Storage configuration
 * @returns StorageAdapter instance
 *
 * @example
 * ```ts
 * const localAdapter = createStorageAdapter({
 *   type: "LOCAL",
 *   uploadDir: "./custom-uploads",
 *   baseUrl: "/custom"
 * });
 * ```
 */
export function createStorageAdapter(
  config: LocalStorageConfig | S3StorageConfig | R2StorageConfig
): StorageAdapter {
  switch (config.type) {
    case "LOCAL":
      return new LocalStorageAdapter(config);
    case "S3":
      return new S3StorageAdapter(config);
    case "R2":
      return new S3StorageAdapter(config);
    default:
      throw new Error(`Unknown storage type: ${(config as { type: string }).type}`);
  }
}

/**
 * Reset the singleton storage adapter instance
 * Useful for testing or when configuration changes
 */
export function resetStorageAdapter(): void {
  storageAdapterInstance = null;
}
