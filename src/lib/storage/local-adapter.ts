/**
 * Local Storage Adapter
 * Implements file storage using the local filesystem
 */

import { mkdir, writeFile, unlink, access, stat } from "fs/promises";
import { join, dirname } from "path";
import type { StorageAdapter, StorageResult, LocalStorageConfig, UploadOptions } from "./types";
import { StorageError } from "./types";

/**
 * Local filesystem storage adapter
 * Stores files in a local directory and serves them via a base URL
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(config: LocalStorageConfig) {
    this.uploadDir = config.uploadDir;
    this.baseUrl = config.baseUrl;
  }

  /**
   * Ensure the upload directory exists
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    try {
      await mkdir(dir, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new StorageError(
          `Failed to create directory: ${dir}`,
          "DIRECTORY_CREATE_FAILED",
          error as Error
        );
      }
    }
  }

  /**
   * Get the full file path for a filename
   */
  private getFilePath(filename: string): string {
    return join(this.uploadDir, filename);
  }

  /**
   * Upload a file to local storage
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<StorageResult> {
    const filePath = this.getFilePath(filename);

    try {
      // Ensure directory exists
      await this.ensureDirectory(filePath);

      // Write file to disk
      await writeFile(filePath, file);

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
        `Failed to upload file: ${filename}`,
        "UPLOAD_FAILED",
        error as Error
      );
    }
  }

  /**
   * Delete a file from local storage
   */
  async delete(filename: string): Promise<void> {
    const filePath = this.getFilePath(filename);

    try {
      await unlink(filePath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      // Ignore if file doesn't exist
      if (nodeError.code === "ENOENT") {
        return;
      }
      throw new StorageError(
        `Failed to delete file: ${filename}`,
        "DELETE_FAILED",
        error as Error
      );
    }
  }

  /**
   * Get the public URL for a file
   */
  getUrl(filename: string): string {
    // Ensure baseUrl doesn't have trailing slash and filename doesn't have leading slash
    const base = this.baseUrl.replace(/\/$/, "");
    const file = filename.replace(/^\//, "");
    return `${base}/${file}`;
  }

  /**
   * Check if a file exists in local storage
   */
  async exists(filename: string): Promise<boolean> {
    const filePath = this.getFilePath(filename);

    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats (useful for debugging/admin)
   */
  async getStats(filename: string): Promise<{ size: number; mtime: Date } | null> {
    const filePath = this.getFilePath(filename);

    try {
      const stats = await stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Create a local storage adapter instance
 */
export function createLocalAdapter(config: LocalStorageConfig): LocalStorageAdapter {
  return new LocalStorageAdapter(config);
}
