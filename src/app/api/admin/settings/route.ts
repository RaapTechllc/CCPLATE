import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { bulkSettingsUpdateSchema } from "@/lib/validations/admin";
import { getAll, getAllGrouped, bulkUpdate } from "@/lib/services/settings-service";
import { logAuditEvent } from "@/lib/audit-log";

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
 * GET /api/admin/settings
 * List all settings (admin only)
 * Query params:
 *   - grouped: if "true", returns settings grouped by category
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Check admin role
    if (session.user.role !== "ADMIN") {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Check if grouped format is requested
    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get("grouped") === "true";

    if (grouped) {
      const settingsByCategory = await getAllGrouped();
      return successResponse(settingsByCategory);
    }

    const settings = await getAll();
    return successResponse(settings);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/admin/settings
 * Bulk update settings (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("UNAUTHORIZED", "Not authenticated", 401);
    }

    // Check admin role
    if (session.user.role !== "ADMIN") {
      return errorResponse("FORBIDDEN", "Admin access required", 403);
    }

    // Parse and validate request body
    const body = await request.json();
    const settingsToUpdate = bulkSettingsUpdateSchema.parse(body);

    if (settingsToUpdate.length === 0) {
      return errorResponse("VALIDATION_ERROR", "No settings provided", 400);
    }

    // Fetch current settings for audit comparison
    const currentSettings = await getAll();
    const currentSettingsMap = new Map(
      currentSettings.map((s) => [s.key, s.value])
    );

    // Bulk update settings
    const updatedSettings = await bulkUpdate(settingsToUpdate);

    // Build audit log changes
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const setting of settingsToUpdate) {
      const oldValue = currentSettingsMap.get(setting.key);
      if (oldValue !== setting.value) {
        changes[setting.key] = {
          old: oldValue ?? null,
          new: setting.value,
        };
      }
    }

    // Log audit event if there were actual changes
    if (Object.keys(changes).length > 0) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;
      logAuditEvent({
        userId: session.user.id,
        userEmail: session.user.email || "unknown",
        action: "UPDATE",
        resource: "admin/settings",
        changes,
        ip: ip || undefined,
      });
    }

    return successResponse(updatedSettings);
  } catch (error) {
    return handleError(error);
  }
}
