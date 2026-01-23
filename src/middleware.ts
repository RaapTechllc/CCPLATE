import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/files",
  "/prompt-builder",
  "/schema-builder",
  "/agent-builder",
  "/api-builder",
  "/component-builder",
  "/hook-builder",
  "/guardian",
  "/profile",
  "/settings",
]

// API routes that require authentication (except public endpoints)
const protectedApiRoutes = [
  "/api/users",
]

// Routes that require admin role
const adminRoutes = [
  "/admin",
  "/api/admin",
]

// Public API endpoints that don't require authentication
const publicApiEndpoints = [
  "/api/users/register",
  "/api/users/verify-email",
]

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isProtectedApiRoute(pathname: string): boolean {
  // Check if it's a protected API route
  const isProtectedApi = protectedApiRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // Exclude public endpoints
  const isPublicEndpoint = publicApiEndpoints.some((endpoint) =>
    pathname === endpoint || pathname.startsWith(`${endpoint}/`)
  )

  return isProtectedApi && !isPublicEndpoint
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the token from the request
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Check if accessing admin routes
  if (isAdminRoute(pathname)) {
    // No token - redirect to login
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Token exists but user is not admin
    if (token.role !== "ADMIN") {
      // For API routes, return 403 Forbidden
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Forbidden: Admin access required",
            },
          },
          { status: 403 }
        )
      }

      // For page routes, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Admin user - allow access
    return NextResponse.next()
  }

  // Check if accessing protected routes
  if (isProtectedRoute(pathname) || isProtectedApiRoute(pathname)) {
    if (!token) {
      // For API routes, return 401 Unauthorized
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Unauthorized: Authentication required",
            },
          },
          { status: 401 }
        )
      }

      // For page routes, redirect to login with callback URL
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Token exists - allow access
    return NextResponse.next()
  }

  // All other routes - pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Protected page routes
    "/dashboard/:path*",
    "/files/:path*",
    "/prompt-builder/:path*",
    "/schema-builder/:path*",
    "/agent-builder/:path*",
    "/api-builder/:path*",
    "/component-builder/:path*",
    "/hook-builder/:path*",
    "/guardian/:path*",
    "/profile/:path*",
    "/settings/:path*",
    // Admin routes
    "/admin/:path*",
    // Protected API routes
    "/api/users/:path*",
    "/api/admin/:path*",
  ],
}
