import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";

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

type UserDoc = Doc<"users">;

function toProfileResponse(user: UserDoc) {
  const createdAt = user.createdAt ?? user._creationTime;
  const updatedAt = user.updatedAt ?? createdAt;
  return {
    id: user._id,
    name: user.name ?? null,
    email: user.email ?? "",
    emailVerified: user.emailVerificationTime
      ? new Date(user.emailVerificationTime).toISOString()
      : null,
    image: user.image ?? null,
    role: user.role ?? "USER",
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
  };
}

/**
 * GET /api/users/me
 * Get the current user's profile
 */
export async function GET() {
  try {
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }
    const currentUser =
      (await convex.query(api.users.getCurrentUser, {})) ?? (user as UserDoc);

    return successResponse(toProfileResponse(currentUser));
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
    const { authenticated, user, convex } = await requireAuth();
    if (!authenticated || !user || !convex) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    if (validatedData.email && validatedData.email !== user.email) {
      const emailExists = await convex.query(api.users.emailInUse, {
        email: validatedData.email,
        excludeUserId: user._id,
      });

      if (emailExists) {
        return errorResponse("VALIDATION_ERROR", "Email already in use", 400);
      }
    }

    const updatedUser = await convex.mutation(api.users.updateProfile, {
      name: validatedData.name,
      email: validatedData.email,
      image: validatedData.image ?? undefined,
    });

    return successResponse(toProfileResponse(updatedUser as UserDoc));
  } catch (error) {
    return handleError(error);
  }
}
