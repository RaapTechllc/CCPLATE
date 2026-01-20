import { NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/api/response";
import { ApiError } from "@/lib/api/errors";
import { hashPassword } from "@/lib/auth-utils";
import { emailSchema, passwordSchema } from "@/lib/validations/common";

// Registration schema
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, "Name is required").max(100, "Name too long").trim(),
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
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return errorResponse(
        "VALIDATION_ERROR",
        "An account with this email already exists",
        400
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        user,
        message: "Registration successful. You can now sign in.",
      },
      undefined,
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
