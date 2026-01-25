import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { idSchema } from "@/lib/validations/common";

// Schema for user updates
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
  role: z.enum(["USER", "ADMIN"]).optional(), // Admin only
});

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
    const message = error.errors
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
 * GET /api/users/[id]
 * Get a user by ID (self or admin only)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { authenticated, user } = await requireAuth();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Validate and extract user ID
    const { id } = await context.params;
    const userId = idSchema.parse(id);

    // Check authorization: must be self or admin
    const isSelf = user._id === userId;
    const isAdmin = user.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      return errorResponse("FORBIDDEN", "You can only view your own profile", 403);
    }

    // Fetch user
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    return successResponse(targetUser);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/users/[id]
 * Update a user (self or admin only)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { authenticated, user } = await requireAuth();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Validate and extract user ID
    const { id } = await context.params;
    const userId = idSchema.parse(id);

    // Check authorization
    const isSelf = user._id === userId;
    const isAdmin = user.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      return errorResponse("FORBIDDEN", "You can only update your own profile", 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Non-admins cannot update role
    if (validatedData.role && !isAdmin) {
      return errorResponse("FORBIDDEN", "Only admins can update user roles", 403);
    }

    // Check if user exists and is not deleted
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // If email is being changed, check for duplicates
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return errorResponse("VALIDATION_ERROR", "Email already in use", 400);
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(updatedUser);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/users/[id]
 * Soft delete a user (admin only)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { authenticated, user, isAdmin } = await requireAdmin();
    if (!authenticated || !user) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    if (!isAdmin) {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Validate and extract user ID
    const { id } = await context.params;
    const userId = idSchema.parse(id);

    // Check if user exists and is not already deleted
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    // Prevent admin from deleting themselves
    if (user._id === userId) {
      return errorResponse("FORBIDDEN", "You cannot delete your own account", 403);
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    return successResponse({ message: "User deleted successfully" });
  } catch (error) {
    return handleError(error);
  }
}
