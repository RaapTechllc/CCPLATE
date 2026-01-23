// This file has been deprecated.
// Password hashing is no longer needed as we only use OAuth providers.
// See convex/auth.ts for the new authentication implementation.
//
// For server-side auth checks, use:
//   import { auth } from "@convex-dev/auth/nextjs/server";
//   const { userId } = await auth();
//
// For client-side auth checks, use:
//   import { useConvexAuth } from "convex/react";
//   const { isAuthenticated, isLoading } = useConvexAuth();

export {};
