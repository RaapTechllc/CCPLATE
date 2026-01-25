import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { userIdSchema, userUpdateSchema } from "@/lib/validations/admin";
import {
  getUser,
  updateUser,
  deleteUser,
  restoreUser,
  emailInUse,
} from "@/lib/services/admin-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
 * GET /api/admin/users/[id]
 * Get a single user by ID (admin only)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication and admin role
    const { authenticated, user, isAdmin } = await requireAdmin();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Validate user ID
    const { id } = await context.params;
    const { id: userId } = userIdSchema.parse({ id });

    // Get user
    const targetUser = await getUser(userId);

    if (!targetUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    return successResponse(targetUser);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update a user (admin only)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication and admin role
    const { authenticated, user, isAdmin } = await requireAdmin();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Validate user ID
    const { id } = await context.params;
    const { id: userId } = userIdSchema.parse({ id });

    // Parse and validate request body
    const body = await request.json();
    const validatedData = userUpdateSchema.parse(body);

    // Check if user exists
    const existingUser = await getUser(userId);
    if (!existingUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // If email is being changed, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const isDuplicate = await emailInUse(validatedData.email, userId);
      if (isDuplicate) {
        return errorResponse("VALIDATION_ERROR", "Email already in use", 400);
      }
    }

    // Prevent admin from demoting themselves
    if (
      userId === user._id &&
      validatedData.role &&
      validatedData.role !== "ADMIN"
    ) {
      return errorResponse(
        "FORBIDDEN",
        "You cannot demote your own admin role",
        403
      );
    }

    // Update user
    const updatedUser = await updateUser(userId, validatedData);

    return successResponse(updatedUser);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Soft delete a user (admin only)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication and admin role
    const { authenticated, user, isAdmin } = await requireAdmin();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Validate user ID
    const { id } = await context.params;
    const { id: userId } = userIdSchema.parse({ id });

    // Check if user exists
    const targetUser = await getUser(userId);
    if (!targetUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // Prevent admin from deleting themselves
    if (userId === user._id) {
      return errorResponse("FORBIDDEN", "You cannot delete your own account", 403);
    }

    // Check if already deleted
    if (targetUser.deletedAt) {
      return errorResponse("VALIDATION_ERROR", "User is already deleted", 400);
    }

    // Soft delete user
    await deleteUser(userId);

    return successResponse({ message: "User deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/admin/users/[id]
 * Restore a soft deleted user (admin only)
 * Use POST with action=restore in body
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Check authentication and admin role
    const { authenticated, user, isAdmin } = await requireAdmin();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Validate user ID
    const { id } = await context.params;
    const { id: userId } = userIdSchema.parse({ id });

    // Parse request body
    const body = await request.json();

    if (body.action !== "restore") {
      return errorResponse("VALIDATION_ERROR", "Invalid action", 400);
    }

    // Check if user exists
    const targetUser = await getUser(userId);
    if (!targetUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // Check if user is actually deleted
    if (!targetUser.deletedAt) {
      return errorResponse("VALIDATION_ERROR", "User is not deleted", 400);
    }

    // Restore user
    const restoredUser = await restoreUser(userId);

    return successResponse(restoredUser);
  } catch (error) {
    return handleError(error);
  }
}
