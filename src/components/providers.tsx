"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode, useMemo } from "react";

// Singleton pattern - only create client once
let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexClient) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error("[Convex] NEXT_PUBLIC_CONVEX_URL is not set");
      throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is required");
    }
    convexClient = new ConvexReactClient(convexUrl);
  }
  return convexClient;
}

export function Providers({ children }: { children: ReactNode }) {
  // Use useMemo to ensure client is created once and handle suspense properly
  const convex = useMemo(() => {
    try {
      return getConvexClient();
    } catch (error) {
      console.error("[Convex] Failed to initialize client:", error);
      return null;
    }
  }, []);

  // If client failed to initialize, show error instead of crashing downstream components
  if (!convex) {
    console.warn("[Convex] Rendering without Convex provider - auth features will be unavailable");
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50 text-red-800 p-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
          <h2 className="text-xl font-bold mb-2">Configuration Error</h2>
          <p>Failed to initialize the application backend.</p>
          <p className="text-sm mt-2 text-red-600">Ensure NEXT_PUBLIC_CONVEX_URL is set correctly.</p>
        </div>
      </div>
    );
  }

  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
