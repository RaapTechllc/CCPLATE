"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// Singleton pattern - only create client once on client side
let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (typeof window === "undefined") {
    // During SSR, return a dummy that won't be used
    return null as unknown as ConvexReactClient;
  }
  if (!convexClient) {
    convexClient = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  }
  return convexClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const convex = getConvexClient();

  // During SSR, render children without provider (will hydrate on client)
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
