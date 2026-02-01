import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { api } from "../../../../../convex/_generated/api";

export async function GET() {
  const { authenticated, user, convex } = await requireAuth();
  if (!authenticated || !user || !convex) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await convex.query(api.analytics.getUserMetrics, {});
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Feature builder metrics error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load metrics" },
      { status: 500 }
    );
  }
}
