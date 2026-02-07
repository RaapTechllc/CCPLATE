import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/files(.*)",
  "/prompt-builder(.*)",
  "/schema-builder(.*)",
  "/agent-builder(.*)",
  "/api-builder(.*)",
  "/component-builder(.*)",
  "/hook-builder(.*)",
  "/guardian(.*)",
  "/profile(.*)",
  "/settings(.*)",
]);

// Admin routes
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
]);

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/login",
  "/api/auth/(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const { pathname } = request.nextUrl;

  // E2E test auth bypass: requires ALL THREE conditions:
  // 1. NOT production (hard safety net)
  // 2. E2E_TEST_AUTH_BYPASS env var set on the server
  // 3. x-e2e-test-auth header on the request (set per-page in tests)
  const isE2ETestBypass =
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_TEST_AUTH_BYPASS === "true" &&
    request.headers.get("x-e2e-test-auth") === "bypass";

  // Check authentication status (default to unauthenticated if Convex is unavailable)
  let isAuthenticated = false;
  if (isE2ETestBypass) {
    isAuthenticated = true;
  } else {
    try {
      isAuthenticated = await convexAuth.isAuthenticated();
    } catch (error) {
      // Convex backend unavailable - treat as unauthenticated
      console.error("[middleware] Auth check failed:", error instanceof Error ? error.message : error);
    }
  }

  // Handle admin routes
  if (isAdminRoute(request)) {
    if (!isAuthenticated) {
      return nextjsMiddlewareRedirect(request, "/login");
    }
    // Note: Admin role check should be done at the Convex query/mutation level
    // Middleware can only check authentication, not authorization
  }

  // Handle protected routes
  if (isProtectedRoute(request)) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return nextjsMiddlewareRedirect(request, loginUrl.toString());
    }
  }

  // Redirect authenticated users away from login page
  if (isAuthenticated && pathname === "/login") {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});

export const config = {
  matcher: [
    // Skip internal Next.js paths and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
