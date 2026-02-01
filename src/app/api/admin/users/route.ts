import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { userListQuerySchema } from "@/lib/validations/admin";
import { getUsers } from "@/lib/services/admin-service";
import { rateLimit, adminRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

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
 * GET /api/admin/users
 * List users with pagination, search, and filters (admin only)
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const ip = getClientIp(request);
  const limit = rateLimit(ip, adminRateLimit);
  if (!limit.success) {
    return rateLimitResponse(limit.reset - Date.now());
  }

  try {
    // Check authentication and admin role
    const { authenticated, user, isAdmin, convex } = await requireAdmin();
    if (!authenticated || !user || !convex) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = userListQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
    });

    // Get paginated users
    const { users, total } = await getUsers(convex, query);

    // Calculate pagination meta
    const totalPages = Math.ceil(total / query.limit);

    return successResponse(users, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    });
  } catch (error) {
    return handleError(error);
  }
}
