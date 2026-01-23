// This file has been deprecated.
// Email/password login is no longer supported.
// Authentication is now OAuth-only via Google and GitHub.
//
// Use OAuthButtons component instead:
//   import { OAuthButtons } from "@/components/features/auth/oauth-buttons";
//
// To complete the migration, delete this file.

export function LoginForm() {
  return (
    <div className="text-center text-sm text-zinc-500">
      <p>Email/password login has been deprecated.</p>
      <p>Please use the OAuth buttons above to sign in.</p>
    </div>
  );
}
