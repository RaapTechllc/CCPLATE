// This file has been deprecated.
// User registration is now handled automatically via OAuth.
// When users sign in with Google or GitHub, accounts are created automatically.
//
// Email/password registration is no longer supported.
// To complete the migration, remove this file.

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Registration has been migrated to Convex Auth. Users sign up automatically via OAuth on /login.",
    },
    { status: 410 }
  );
}
