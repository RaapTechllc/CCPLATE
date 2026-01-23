import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, authRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const handler = NextAuth(authOptions);

/**
 * Rate-limited wrapper for auth endpoints
 * Applies stricter rate limiting to credential-based authentication
 */
async function rateLimitedHandler(req: NextRequest): Promise<Response> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
             headersList.get("x-real-ip") || 
             "unknown";
  
  // Apply rate limiting to POST requests (login attempts)
  if (req.method === "POST") {
    const rateLimitResult = rateLimit(`auth:${ip}`, authRateLimit);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        { 
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimitResult.reset),
          }
        }
      );
    }
  }
  
  // Call the actual NextAuth handler
  return handler(req);
}

export async function GET(req: NextRequest): Promise<Response> {
  return handler(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  return rateLimitedHandler(req);
}
