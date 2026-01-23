// This file has been deprecated.
// Authentication is now handled by Convex Auth.
// OAuth callbacks are processed by the Convex HTTP routes defined in convex/http.ts
//
// The NextAuth routes are no longer needed. This file can be safely deleted.
// To complete the migration, remove the entire src/app/api/auth directory.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error:
        "Authentication has been migrated to Convex Auth. Use the OAuth buttons on /login.",
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Authentication has been migrated to Convex Auth. Use the OAuth buttons on /login.",
    },
    { status: 410 }
  );
}
