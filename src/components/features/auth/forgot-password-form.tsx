// This file has been deprecated.
// Password reset is no longer needed as we only use OAuth providers.
// Users can recover access through their Google or GitHub account.
//
// To complete the migration, delete this file.

export function ForgotPasswordForm() {
  return (
    <div className="text-center text-sm text-zinc-500">
      <p>Password reset has been deprecated.</p>
      <p>
        Since we use OAuth-only authentication, you can recover access through
        your Google or GitHub account.
      </p>
    </div>
  );
}
