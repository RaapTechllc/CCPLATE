/**
 * File Service
 * Handles file upload, retrieval, and deletion operations
 */

import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/db";
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
} from "@/types/file";
import { StorageType } from "@/generated/prisma/client";

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
function toFileResponse(file: {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  storageType: StorageType;
  createdAt: Date;
}): FileResponse {
  return {
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url: file.url,
    storageType: file.storageType,
    createdAt: file.createdAt.toISOString(),
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
  userId: string,
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
  const file = await prisma.file.create({
    data: {
      filename: result.filename,
      originalName,
      mimeType,
      size: result.size,
      url: result.url,
      storageType,
      userId,
    },
  });

  return toFileResponse(file);
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
  userId: string,
  files: Array<{ buffer: Buffer; originalName: string; mimeType: string }>
): Promise<FileResponse[]> {
  const results: FileResponse[] = [];

  for (const file of files) {
    const result = await uploadFile(
      userId,
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
  userId: string,
  query: FileListQuery = {}
): Promise<PaginatedFiles> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  // Build where clause
  const where: {
    userId: string;
    deletedAt: null;
    mimeType?: string;
  } = {
    userId,
    deletedAt: null,
  };

  if (query.mimeType) {
    where.mimeType = query.mimeType;
  }

  // Get files and total count in parallel
  const [files, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.file.count({ where }),
  ]);

  return {
    files: files.map(toFileResponse),
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
 * @param fileId - ID of the file to retrieve
 * @returns File information or null if not found
 *
 * @example
 * ```ts
 * const file = await getFile("file123");
 * if (file) {
 *   console.log(file.url);
 * }
 * ```
 */
export async function getFile(fileId: string): Promise<FileResponse | null> {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      deletedAt: null,
    },
  });

  if (!file) {
    return null;
  }

  return toFileResponse(file);
}

/**
 * Permanently delete a file (hard delete)
 * Removes file from both storage and database
 *
 * @param fileId - ID of the file to delete
 * @param userId - ID of the user requesting deletion (for ownership check)
 * @throws FileServiceError if file not found or user doesn't own the file
 *
 * @example
 * ```ts
 * await deleteFile("file123", "user123");
 * ```
 */
export async function deleteFile(fileId: string, userId: string): Promise<void> {
  // Find the file
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      deletedAt: null,
    },
  });

  if (!file) {
    throw new FileServiceError("File not found", "FILE_NOT_FOUND", 404);
  }

  // Check ownership (allow if user owns the file)
  if (file.userId !== userId) {
    throw new FileServiceError(
      "You do not have permission to delete this file",
      "FORBIDDEN",
      403
    );
  }

  // Delete from storage
  const storage = getStorageAdapter();
  try {
    await storage.delete(file.filename);
  } catch (error) {
    // Log error but continue with database deletion
    console.error(`Failed to delete file from storage: ${file.filename}`, error);
  }

  // Delete from database
  await prisma.file.delete({
    where: { id: fileId },
  });
}

/**
 * Soft delete a file (marks as deleted but keeps in storage)
 * Useful for recovery and audit purposes
 *
 * @param fileId - ID of the file to soft delete
 * @param userId - ID of the user requesting deletion
 * @throws FileServiceError if file not found or user doesn't own the file
 *
 * @example
 * ```ts
 * await softDeleteFile("file123", "user123");
 * ```
 */
export async function softDeleteFile(
  fileId: string,
  userId: string
): Promise<void> {
  // Find the file
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      deletedAt: null,
    },
  });

  if (!file) {
    throw new FileServiceError("File not found", "FILE_NOT_FOUND", 404);
  }

  // Check ownership
  if (file.userId !== userId) {
    throw new FileServiceError(
      "You do not have permission to delete this file",
      "FORBIDDEN",
      403
    );
  }

  // Soft delete by setting deletedAt
  await prisma.file.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Delete file with admin privileges (can delete any user's file)
 *
 * @param fileId - ID of the file to delete
 * @param hardDelete - Whether to permanently delete or soft delete
 * @throws FileServiceError if file not found
 */
export async function adminDeleteFile(
  fileId: string,
  hardDelete: boolean = false
): Promise<void> {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      deletedAt: null,
    },
  });

  if (!file) {
    throw new FileServiceError("File not found", "FILE_NOT_FOUND", 404);
  }

  if (hardDelete) {
    // Delete from storage
    const storage = getStorageAdapter();
    try {
      await storage.delete(file.filename);
    } catch (error) {
      console.error(`Failed to delete file from storage: ${file.filename}`, error);
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });
  } else {
    // Soft delete
    await prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });
  }
}
