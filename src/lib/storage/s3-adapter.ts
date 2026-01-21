/**
 * S3 Storage Adapter
 * Implements file storage using AWS S3 or S3-compatible services (like Cloudflare R2)
 *
 * NOTE: This adapter requires @aws-sdk/client-s3 to be installed.
 * Run: npm install @aws-sdk/client-s3
 */

import type { StorageAdapter, StorageResult, S3StorageConfig, R2StorageConfig, UploadOptions } from "./types";
import { StorageError } from "./types";

// S3 client type - uses 'unknown' to avoid requiring @aws-sdk/client-s3 at compile time
// The actual types are validated at runtime when the SDK is loaded
type S3ClientInstance = unknown;

// Dynamic import helper to avoid TypeScript static analysis of the module
async function loadS3SDK(): Promise<{
  S3Client: new (config: unknown) => unknown;
  PutObjectCommand: new (params: unknown) => unknown;
  DeleteObjectCommand: new (params: unknown) => unknown;
  HeadObjectCommand: new (params: unknown) => unknown;
}> {
  const moduleName = "@aws-sdk/client-s3";
  try {
    // Using indirect import to prevent TypeScript from statically analyzing the module
    const sdk = await (Function('moduleName', 'return import(moduleName)')(moduleName));
    return sdk;
  } catch (error) {
    throw new StorageError(
      `Failed to load AWS S3 SDK. Make sure @aws-sdk/client-s3 is installed: npm install @aws-sdk/client-s3`,
      "S3_SDK_NOT_INSTALLED",
      error as Error
    );
  }
}

/**
 * S3/R2 storage adapter
 * Works with AWS S3 and Cloudflare R2 (S3-compatible)
 */
export class S3StorageAdapter implements StorageAdapter {
  private client: S3ClientInstance | null = null;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly forcePathStyle: boolean;
  private readonly publicUrl?: string;

  constructor(config: S3StorageConfig | R2StorageConfig) {
    this.bucket = config.bucket;
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;

    if (config.type === "R2") {
      // R2 configuration
      this.region = "auto";
      this.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
      this.forcePathStyle = true;
      this.publicUrl = config.publicUrl;
    } else {
      // S3 configuration
      this.region = config.region;
      this.endpoint = config.endpoint;
      this.forcePathStyle = config.forcePathStyle || false;
    }
  }

  /**
   * Get or create the S3 client (lazy initialization)
   */
  private async getClient(): Promise<S3ClientInstance> {
    if (this.client) {
      return this.client;
    }

    try {
      const { S3Client } = await loadS3SDK();

      this.client = new S3Client({
        region: this.region,
        endpoint: this.endpoint,
        forcePathStyle: this.forcePathStyle,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });

      return this.client;
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        "Failed to initialize S3 client. Make sure @aws-sdk/client-s3 is installed: npm install @aws-sdk/client-s3",
        "S3_CLIENT_INIT_FAILED",
        error as Error
      );
    }
  }

  /**
   * Upload a file to S3/R2
   */
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    try {
      const client = await this.getClient();
      const { PutObjectCommand } = await loadS3SDK();

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file,
        ContentType: options?.contentType || mimeType,
        CacheControl: options?.cacheControl || "public, max-age=31536000",
        Metadata: options?.metadata,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).send(command);

      return {
        filename,
        url: this.getUrl(filename),
        size: file.length,
      };
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to upload file to S3: ${filename}`,
        "S3_UPLOAD_FAILED",
        error as Error
      );
    }
  }

  /**
   * Delete a file from S3/R2
   */
  async delete(filename: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { DeleteObjectCommand } = await loadS3SDK();

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).send(command);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to delete file from S3: ${filename}`,
        "S3_DELETE_FAILED",
        error as Error
      );
    }
  }

  /**
   * Get the public URL for a file
   */
  getUrl(filename: string): string {
    // If a custom public URL is configured (e.g., for R2 custom domains)
    if (this.publicUrl) {
      const base = this.publicUrl.replace(/\/$/, "");
      const file = filename.replace(/^\//, "");
      return `${base}/${file}`;
    }

    // For R2 without custom domain, use the standard R2.dev URL
    if (this.endpoint?.includes("r2.cloudflarestorage.com")) {
      // R2 public URLs use a different format
      // You need to enable public access for the bucket
      const file = filename.replace(/^\//, "");
      return `https://${this.bucket}.r2.dev/${file}`;
    }

    // Standard S3 URL format
    const file = filename.replace(/^\//, "");
    if (this.forcePathStyle && this.endpoint) {
      return `${this.endpoint}/${this.bucket}/${file}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${file}`;
  }

  /**
   * Check if a file exists in S3/R2
   */
  async exists(filename: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { HeadObjectCommand } = await loadS3SDK();

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (client as any).send(command);
      return true;
    } catch (error) {
      // Check if it's a "not found" error
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Error.name === "NotFound" ||
        s3Error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }

      // For other errors, throw
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        `Failed to check file existence in S3: ${filename}`,
        "S3_EXISTS_CHECK_FAILED",
        error as Error
      );
    }
  }
}

/**
 * Create an S3 storage adapter instance
 */
export function createS3Adapter(config: S3StorageConfig): S3StorageAdapter {
  return new S3StorageAdapter(config);
}

/**
 * Create an R2 storage adapter instance
 */
export function createR2Adapter(config: R2StorageConfig): S3StorageAdapter {
  return new S3StorageAdapter(config);
}
