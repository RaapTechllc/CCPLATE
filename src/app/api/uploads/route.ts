/**
 * File Upload API Routes
 * Handles file upload and listing operations
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  uploadFile,
  uploadMultiple,
  getUserFiles,
  FileServiceError,
} from "@/lib/services/file-service";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/file";
import { rateLimit } from "@/lib/rate-limit";

// Rate limit for uploads: 20 uploads per minute per user
const uploadRateLimit = { interval: 60000, maxRequests: 20 };

/**
 * POST /api/uploads
 * Upload one or more files
 *
 * Request: multipart/form-data with "file" or "files" field
 * Response: Uploaded file(s) information
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Rate limit uploads per user
    const rateLimitResult = rateLimit(`upload:${user._id}`, uploadRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Upload rate limit exceeded. Please try again later.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
          }
        }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();

    // Get files from form data
    const file = formData.get("file") as File | null;
    const files = formData.getAll("files") as File[];

    // Handle single file upload
    if (file && file instanceof File) {
      // Read file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await uploadFile(
        convex,
        buffer,
        file.name,
        file.type || "application/octet-stream"
      );

      return NextResponse.json({ file: result }, { status: 201 });
    }

    // Handle multiple file upload
    if (files.length > 0) {
      // Limit number of files per request
      const maxFiles = 10;
      if (files.length > maxFiles) {
        return NextResponse.json(
          {
            error: `Maximum ${maxFiles} files allowed per request`,
            code: "TOO_MANY_FILES",
          },
          { status: 400 }
        );
      }

      // Prepare files for upload
      const fileDataPromises = files
        .filter((f): f is File => f instanceof File)
        .map(async (f) => {
          const arrayBuffer = await f.arrayBuffer();
          return {
            buffer: Buffer.from(arrayBuffer),
            originalName: f.name,
            mimeType: f.type || "application/octet-stream",
          };
        });

      const fileData = await Promise.all(fileDataPromises);
      const results = await uploadMultiple(convex, fileData);

      return NextResponse.json({ files: results }, { status: 201 });
    }

    // No files provided
    return NextResponse.json(
      { error: "No files provided", code: "NO_FILES" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Upload error:", error);

    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload file", code: "UPLOAD_FAILED" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/uploads
 * List user's uploaded files with pagination
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - mimeType: Filter by MIME type (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const mimeType = searchParams.get("mimeType") || undefined;

    // Validate parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: "Invalid page parameter", code: "INVALID_PARAM" },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid limit parameter (must be 1-100)", code: "INVALID_PARAM" },
        { status: 400 }
      );
    }

    // Get user's files
    const result = await getUserFiles(convex, {
      page,
      limit,
      mimeType,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("List files error:", error);

    return NextResponse.json(
      { error: "Failed to list files", code: "LIST_FAILED" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/uploads
 * Handle preflight requests and return upload constraints
 */
export async function OPTIONS() {
  return NextResponse.json({
    allowedTypes: ALLOWED_FILE_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 10,
  });
}
