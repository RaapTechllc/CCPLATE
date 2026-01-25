import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { settingKeySchema, settingUpdateSchema } from "@/lib/validations/admin";
import { getByKey, update } from "@/lib/services/settings-service";

type RouteContext = {
  params: Promise<{ key: string }>;
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
 * GET /api/admin/settings/[key]
 * Get a single setting by key (admin only)
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

    // Validate setting key
    const { key } = await context.params;
    const { key: settingKey } = settingKeySchema.parse({ key });

    // Get setting
    const setting = await getByKey(settingKey);

    if (!setting) {
      return errorResponse("NOT_FOUND", "Setting not found", 404);
    }

    return successResponse(setting);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/admin/settings/[key]
 * Update a single setting (admin only)
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

    // Validate setting key
    const { key } = await context.params;
    const { key: settingKey } = settingKeySchema.parse({ key });

    // Parse and validate request body
    const body = await request.json();
    const { value, type } = settingUpdateSchema.parse(body);

    // Update setting (creates if doesn't exist)
    const updatedSetting = await update(settingKey, value, type);

    return successResponse(updatedSetting);
  } catch (error) {
    return handleError(error);
  }
}
