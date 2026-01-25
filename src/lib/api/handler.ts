import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiError } from "./errors"
import { errorResponse } from "./response"

type RouteHandler = (
  request: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse> | NextResponse

/**
 * Wraps an API route handler with standardized error handling.
 *
 * Features:
 * - Catches and handles ApiError instances
 * - Handles Zod validation errors
 * - Returns standardized error responses
 * - Logs errors in development mode
 *
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData()
 *   return successResponse(data)
 * })
 * ```
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context)
    } catch (error) {
      // Log errors in development
      if (process.env.NODE_ENV === "development") {
        console.error("[API Error]", error)
      }

      // Handle ApiError instances
      if (error instanceof ApiError) {
        return errorResponse(error.code, error.message, error.status)
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const message = error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")
        return errorResponse("VALIDATION_ERROR", message, 400)
      }

      // Handle generic errors
      if (error instanceof Error) {
        // In production, don't expose internal error messages
        const message =
          process.env.NODE_ENV === "development"
            ? error.message
            : "An unexpected error occurred"
        return errorResponse("INTERNAL_ERROR", message, 500)
      }

      // Fallback for unknown error types
      return errorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        500
      )
    }
  }
}
