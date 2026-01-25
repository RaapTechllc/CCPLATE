"use server";

/**
 * Auth Actions - DEPRECATED
 *
 * This file contains server actions for authentication.
 * Most password-related functions are deprecated since we use OAuth only.
 *
 * Password reset and email verification are no longer needed with OAuth providers
 * as those providers handle authentication and email verification themselves.
 */

import { z } from "zod";

// Schema kept for reference if password auth is re-enabled
const _forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const _resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/**
 * @deprecated Password reset is not available with OAuth-only authentication.
 * Users should use their OAuth provider's password reset functionality.
 */
export async function forgotPasswordAction(
  _email: string
): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: "Password reset is not available. Please use your OAuth provider (Google, GitHub) to manage your password.",
  };
}

/**
 * @deprecated Password reset is not available with OAuth-only authentication.
 * Users should use their OAuth provider's password reset functionality.
 */
export async function resetPasswordAction(
  _token: string,
  _newPassword: string
): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: "Password reset is not available. Please use your OAuth provider (Google, GitHub) to manage your password.",
  };
}

/**
 * @deprecated Email verification is handled by OAuth providers.
 * OAuth providers (Google, GitHub) verify email addresses as part of their signup flow.
 */
export async function sendVerificationEmailAction(): Promise<{
  success: boolean;
  message: string;
}> {
  return {
    success: false,
    message: "Email verification is handled by your OAuth provider (Google, GitHub). No additional verification is needed.",
  };
}

/**
 * @deprecated Email verification is handled by OAuth providers.
 * OAuth providers (Google, GitHub) verify email addresses as part of their signup flow.
 */
export async function verifyEmailAction(
  _token: string
): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: "Email verification is handled by your OAuth provider (Google, GitHub). No additional verification is needed.",
  };
}
