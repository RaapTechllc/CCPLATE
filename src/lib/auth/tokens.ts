/**
 * Auth Tokens - DEPRECATED
 *
 * Token management is now handled by Convex Auth internally.
 * Password reset and email verification flows are no longer needed
 * as we only use OAuth providers (Google, GitHub).
 */

/**
 * @deprecated Password reset is not available with OAuth-only authentication.
 * Returns null to indicate invalid token - callers should show appropriate message.
 */
export async function validatePasswordResetToken(
  _token: string
): Promise<null> {
  // OAuth-only auth - password reset tokens are not supported
  return null;
}

/**
 * @deprecated Email verification tokens are not needed with OAuth providers.
 */
export async function validateEmailVerificationToken(
  _token: string
): Promise<null> {
  return null;
}

/**
 * @deprecated Token generation is not needed with OAuth providers.
 */
export async function generatePasswordResetToken(_userId: string): Promise<never> {
  throw new Error(
    "Password reset is not available. This project uses OAuth only. " +
    "Users should reset passwords through their OAuth provider (Google, GitHub)."
  );
}

/**
 * @deprecated Token generation is not needed with OAuth providers.
 */
export async function generateEmailVerificationToken(_userId: string): Promise<never> {
  throw new Error(
    "Email verification tokens are not needed. " +
    "OAuth providers (Google, GitHub) verify email addresses during signup."
  );
}
