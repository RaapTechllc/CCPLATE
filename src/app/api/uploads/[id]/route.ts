/**
 * Single File API Routes
 * Handles operations on individual files
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getFile,
  deleteFile,
  softDeleteFile,
  adminDeleteFile,
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
    const { authenticated, user } = await requireAuth();
    if (!authenticated || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Get file info
    const file = await getFile(id);

    if (!file) {
      return NextResponse.json(
        { error: "File not found", code: "FILE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Check if user can access this file
    // Users can only see their own files unless they're admin
    const dbFile = await prisma.file.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (dbFile?.userId !== user._id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Get file error:", error);

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
    const { authenticated, user } = await requireAuth();
    if (!authenticated || !user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get("hard") === "true";

    // Get file to check ownership
    const file = await prisma.file.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: { userId: true },
    });

    if (!file) {
      return NextResponse.json(
        { error: "File not found", code: "FILE_NOT_FOUND" },
        { status: 404 }
      );
    }

    const isOwner = file.userId === user._id;
    const isAdmin = user.role === "ADMIN";

    // Check permissions
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // Admin deleting another user's file
    if (isAdmin && !isOwner) {
      await adminDeleteFile(id, hardDelete);
      return NextResponse.json({
        message: "File deleted successfully",
        hardDelete,
      });
    }

    // User deleting their own file
    if (hardDelete) {
      await deleteFile(id, user._id);
    } else {
      await softDeleteFile(id, user._id);
    }

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
