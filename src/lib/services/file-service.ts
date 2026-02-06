/**
 * File Service
 * Handles file upload, retrieval, and deletion operations
 */

import { ConvexHttpClient } from "convex/browser";
import { fileTypeFromBuffer } from "file-type";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { getStorageAdapter } from "@/lib/storage";
import {
  generateUniqueFilename,
  validateFileType,
  validateFileSize,
} from "@/lib/file-utils";
import type {
  FileResponse,
  FileListQuery,
  PaginatedFiles,
  UploadOptions,
  StorageType,
} from "@/types/file";

// Re-export constants for convenience
export { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/file";

/**
 * Error thrown when file operations fail
 */
export class FileServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "FileServiceError";
  }
}

type FileDoc = Doc<"files">;

function handleConvexError(error: unknown): never {
  if (error instanceof Error) {
    if (error.message.includes("Unauthorized")) {
      throw new FileServiceError("Not authenticated", "UNAUTHORIZED", 401);
    }
    if (error.message.includes("Forbidden")) {
      throw new FileServiceError(
        "You do not have permission to access this file",
        "FORBIDDEN",
        403
      );
    }
  }

  throw error;
}

/**
 * Validate that file content matches declared MIME type using magic bytes
 * Prevents MIME type spoofing attacks
 *
 * @param buffer - File content as Buffer
 * @param declaredMimeType - MIME type declared by client
 * @returns true if content matches declared type, false otherwise
 */
async function validateFileContent(
  buffer: Buffer,
  declaredMimeType: string
): Promise<boolean> {
  const detected = await fileTypeFromBuffer(buffer);

  // Allow text files (no magic bytes) - they can't be detected
  if (!detected && declaredMimeType.startsWith("text/")) {
    return true;
  }

  // Allow application/octet-stream as fallback type
  if (!detected && declaredMimeType === "application/octet-stream") {
    return true;
  }

  // If we detected a type, it must match the declared type
  if (detected && detected.mime !== declaredMimeType) {
    return false;
  }

  // If no type detected and not a text/octet-stream type, reject
  if (!detected) {
    return false;
  }

  return true;
}

/**
 * Transform a database file record to API response format
 */
function toFileResponse(file: FileDoc): FileResponse {
  const createdAt = file.createdAt ?? file._creationTime;
  return {
    id: file._id,
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url: file.url,
    storageType: file.storageType,
    createdAt: new Date(createdAt).toISOString(),
  };
}

/**
 * Upload a single file
 *
 * @param userId - ID of the user uploading the file
 * @param buffer - File data as Buffer
 * @param originalName - Original filename from upload
 * @param mimeType - MIME type of the file
 * @param options - Optional upload configuration
 * @returns Uploaded file information
 * @throws FileServiceError if validation fails or upload fails
 *
 * @example
 * ```ts
 * const file = await uploadFile(
 *   "user123",
 *   fileBuffer,
 *   "document.pdf",
 *   "application/pdf"
 * );
 * ```
 */
export async function uploadFile(
  client: ConvexHttpClient,
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  options?: UploadOptions
): Promise<FileResponse> {
  // Import constants dynamically to avoid circular dependencies
  const { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } = await import("@/types/file");

  // Determine allowed types and max size
  const allowedTypes = options?.allowedTypes ?? [...ALLOWED_FILE_TYPES];
  const maxSize = options?.maxSize ?? MAX_FILE_SIZE;

  // Validate file type
  if (!validateFileType(mimeType, allowedTypes)) {
    throw new FileServiceError(
      `File type "${mimeType}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      "INVALID_FILE_TYPE"
    );
  }

  // Validate file size
  if (!validateFileSize(buffer.length, maxSize)) {
    throw new FileServiceError(
      `File size ${buffer.length} exceeds maximum allowed size of ${maxSize} bytes`,
      "FILE_TOO_LARGE"
    );
  }

  // Validate file content matches declared MIME type (magic byte validation)
  const contentValid = await validateFileContent(buffer, mimeType);
  if (!contentValid) {
    throw new FileServiceError(
      "File content does not match declared MIME type",
      "MIME_TYPE_MISMATCH"
    );
  }

  // Generate unique filename
  const uniqueFilename = generateUniqueFilename(originalName);

  // Get storage adapter and upload
  const storage = getStorageAdapter();
  const result = await storage.upload(buffer, uniqueFilename, mimeType);

  // Determine storage type from environment
  const storageType = (process.env.STORAGE_TYPE || "LOCAL") as StorageType;

  // Save file record to database
  try {
    const file = await client.mutation(api.files.createFile, {
      filename: result.filename,
      originalName,
      mimeType,
      size: result.size,
      url: result.url,
      storageType,
    });

    if (!file) {
      throw new FileServiceError("Failed to create file record", "UPLOAD_FAILED", 500);
    }

    return toFileResponse(file);
  } catch (error) {
    handleConvexError(error);
  }
}

/**
 * Upload multiple files
 *
 * @param userId - ID of the user uploading the files
 * @param files - Array of files to upload
 * @returns Array of uploaded file information
 *
 * @example
 * ```ts
 * const files = await uploadMultiple("user123", [
 *   { buffer: buf1, originalName: "doc1.pdf", mimeType: "application/pdf" },
 *   { buffer: buf2, originalName: "doc2.pdf", mimeType: "application/pdf" },
 * ]);
 * ```
 */
export async function uploadMultiple(
  client: ConvexHttpClient,
  files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>
): Promise<FileResponse[]> {
  const results: FileResponse[] = [];

  for (const file of files) {
    const result = await uploadFile(
      client,
      file.buffer,
      file.originalName,
      file.mimeType
    );
    results.push(result);
  }

  return results;
}

/**
 * Get paginated list of user's files
 *
 * @param userId - ID of the user
 * @param query - Pagination and filter options
 * @returns Paginated file list
 *
 * @example
 * ```ts
 * const { files, pagination } = await getUserFiles("user123", {
 *   page: 1,
 *   limit: 20,
 *   mimeType: "image/jpeg"
 * });
 * ```
 */
export async function getUserFiles(
  client: ConvexHttpClient,
  query: FileListQuery = {}
): Promise<PaginatedFiles> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  let files: FileDoc[] = [];
  try {
    files = await client.query(api.files.getFiles, {
      mimeType: query.mimeType,
      includeDeleted: false,
    });
  } catch (error) {
    handleConvexError(error);
  }

  const total = files.length;
  const pagedFiles = files.slice(skip, skip + limit);

  return {
    files: pagedFiles.map(toFileResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single file by ID
 *
 * @param client - Authenticated Convex client
 * @param fileId - ID of the file to retrieve
 * @returns File information or null if not found
 *
 * @example
 * ```ts
 * const file = await getFile(client, "file123");
 * if (file) {
 *   console.log(file.url);
 * }
 * ```
 */
export async function getFile(
  client: ConvexHttpClient,
  fileId: string
): Promise<FileResponse | null> {
  try {
    const file = await client.query(api.files.getFileById, {
      fileId: fileId as Id<"files">,
      includeDeleted: false,
    });

    return file ? toFileResponse(file) : null;
  } catch (error) {
    handleConvexError(error);
  }
}

/**
 * Delete a file (soft or hard delete)
 * Hard delete removes file from both storage and database
 *
 * @param client - Authenticated Convex client
 * @param fileId - ID of the file to delete
 * @param hardDelete - Whether to permanently delete or soft delete
 * @throws FileServiceError if file not found or user doesn't own the file
 *
 * @example
 * ```ts
 * await deleteFile(client, "file123", true);
 * ```
 */
export async function deleteFile(
  client: ConvexHttpClient,
  fileId: string,
  hardDelete: boolean = false
): Promise<void> {
  let file: FileDoc | null = null;

  try {
    file = await client.query(api.files.getFileById, {
      fileId: fileId as Id<"files">,
      includeDeleted: false,
    });
  } catch (error) {
    handleConvexError(error);
  }

  if (!file) {
    throw new FileServiceError("File not found", "FILE_NOT_FOUND", 404);
  }

  if (hardDelete) {
    const storage = getStorageAdapter();
    try {
      await storage.delete(file.filename);
    } catch (error) {
      console.error(`Failed to delete file from storage: ${file.filename}`, error);
    }
  }

  try {
    await client.mutation(api.files.deleteFile, {
      fileId: fileId as Id<"files">,
      hardDelete,
    });
  } catch (error) {
    handleConvexError(error);
  }
}
