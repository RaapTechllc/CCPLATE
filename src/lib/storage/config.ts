/**
 * Storage Configuration
 * Loads storage settings from environment variables
 */

import type { StorageConfig, LocalStorageConfig, S3StorageConfig, R2StorageConfig } from "./types";

/**
 * Storage type from environment
 */
export type StorageType = "LOCAL" | "S3" | "R2";

/**
 * Get storage type from environment
 */
export function getStorageType(): StorageType {
  const type = process.env.STORAGE_TYPE?.toUpperCase();

  if (type === "S3" || type === "R2" || type === "LOCAL") {
    return type;
  }

  // Default to LOCAL for development
  return "LOCAL";
}

/**
 * Get local storage configuration
 */
function getLocalConfig(): LocalStorageConfig {
  const uploadDir = process.env.LOCAL_UPLOAD_DIR || "./uploads";
  const baseUrl = process.env.LOCAL_UPLOAD_URL || "/uploads";

  return {
    type: "LOCAL",
    uploadDir,
    baseUrl,
  };
}

/**
 * Get S3 storage configuration
 */
function getS3Config(): S3StorageConfig {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || process.env.AWS_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

  if (!bucket) {
    throw new Error("S3_BUCKET environment variable is required for S3 storage");
  }
  if (!region) {
    throw new Error("S3_REGION or AWS_REGION environment variable is required for S3 storage");
  }
  if (!accessKeyId) {
    throw new Error("S3_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID environment variable is required for S3 storage");
  }
  if (!secretAccessKey) {
    throw new Error("S3_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY environment variable is required for S3 storage");
  }

  return {
    type: "S3",
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    forcePathStyle,
  };
}

/**
 * Get R2 storage configuration
 */
function getR2Config(): R2StorageConfig {
  const bucket = process.env.R2_BUCKET;
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucket) {
    throw new Error("R2_BUCKET environment variable is required for R2 storage");
  }
  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID environment variable is required for R2 storage");
  }
  if (!accessKeyId) {
    throw new Error("R2_ACCESS_KEY_ID environment variable is required for R2 storage");
  }
  if (!secretAccessKey) {
    throw new Error("R2_SECRET_ACCESS_KEY environment variable is required for R2 storage");
  }

  return {
    type: "R2",
    bucket,
    accountId,
    accessKeyId,
    secretAccessKey,
    publicUrl,
  };
}

/**
 * Get storage configuration based on STORAGE_TYPE environment variable
 */
export function getStorageConfig(): StorageConfig {
  const storageType = getStorageType();

  switch (storageType) {
    case "S3":
      return getS3Config();
    case "R2":
      return getR2Config();
    case "LOCAL":
    default:
      return getLocalConfig();
  }
}

/**
 * Environment variable reference for storage configuration
 *
 * Common:
 *   STORAGE_TYPE - "LOCAL" | "S3" | "R2" (default: "LOCAL")
 *
 * Local Storage:
 *   LOCAL_UPLOAD_DIR - Directory path (default: "./uploads")
 *   LOCAL_UPLOAD_URL - Base URL for files (default: "/uploads")
 *
 * S3 Storage:
 *   S3_BUCKET - Bucket name (required)
 *   S3_REGION or AWS_REGION - AWS region (required)
 *   S3_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID - Access key (required)
 *   S3_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY - Secret key (required)
 *   S3_ENDPOINT - Custom endpoint URL (optional)
 *   S3_FORCE_PATH_STYLE - "true" for path-style URLs (optional)
 *
 * R2 Storage (Cloudflare):
 *   R2_BUCKET - Bucket name (required)
 *   R2_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID - Account ID (required)
 *   R2_ACCESS_KEY_ID - R2 access key (required)
 *   R2_SECRET_ACCESS_KEY - R2 secret key (required)
 *   R2_PUBLIC_URL - Public bucket URL (optional, for custom domains)
 */
