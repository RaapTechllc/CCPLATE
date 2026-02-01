/**
 * Single File API Routes
 * Handles operations on individual files
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getFile,
  deleteFile,
  FileServiceError,
} from "@/lib/services/file-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/uploads/[id]
 * Get information about a single file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check authentication
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get file info
    const file = await getFile(convex, id);

    if (!file) {
      return NextResponse.json(
        { error: "File not found", code: "FILE_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Get file error:", error);

    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to get file", code: "GET_FAILED" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/uploads/[id]
 * Delete a file
 *
 * Query params:
 * - hard: If "true", permanently delete (admin only for other users' files)
 *
 * Users can delete their own files
 * Admins can delete any file
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check authentication
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    await deleteFile(convex, id, hardDelete);

    return NextResponse.json({
      message: "File deleted successfully",
      hardDelete,
    });
  } catch (error) {
    console.error("Delete file error:", error);

    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete file", code: "DELETE_FAILED" },
      { status: 500 }
    );
  }
}
