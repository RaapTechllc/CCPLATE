import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";

// Schema for updating own profile
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  image: z.string().url().optional().nullable(),
});

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
 * GET /api/users/me
 * Get the current user's profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Fetch current user
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
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

    if (!user) {
      return errorResponse("NOT_FOUND", "User not found", 404);
    }

    return successResponse(user);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/users/me
 * Update the current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id: session.user.id,
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
      where: { id: session.user.id },
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
