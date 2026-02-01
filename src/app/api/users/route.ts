import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { paginationSchema } from "@/lib/validations/common";
import { getUsers } from "@/lib/services/admin-service";

/**
 * Handle errors consistently across all route handlers
 */
function handleError(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error("[API Error]", error);
  }

  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.status);
  }

  if (error instanceof ZodError) {
    const message = error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    return errorResponse("VALIDATION_ERROR", message, 400);
  }

  if (error instanceof Error) {
    const message =
      process.env.NODE_ENV === "development"
        ? error.message
        : "An unexpected error occurred";
    return errorResponse("INTERNAL_ERROR", message, 500);
  }

  return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500);
}

/**
 * GET /api/users
 * List all users with pagination (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const { authenticated, user, isAdmin, convex } = await requireAdmin();
    if (!authenticated || !user || !convex) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Parse pagination from query params
    const { searchParams } = new URL(request.url);
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 10,
    });

    const { users, total } = await getUsers(convex, {
      page,
      limit,
      status: "active",
    });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return successResponse(users, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return handleError(error);
  }
}
