// This file has been deprecated.
// User registration is now handled automatically via OAuth.
// When users sign in with Google or GitHub, accounts are created automatically.
//
// To complete the migration, delete this file.

export function RegisterForm() {
  return (
    <div className="text-center text-sm text-zinc-500">
      <p>Email/password registration has been deprecated.</p>
      <p>Please use the OAuth buttons to create an account.</p>
    </div>
  );
}
