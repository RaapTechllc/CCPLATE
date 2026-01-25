import { NextRequest, NextResponse } from "next/server";
import { loadAgents, createAgent } from "@/lib/agent-builder/storage";
import { CreateAgentSchema } from "@/lib/agent-builder/schema";
import { requireAuth } from "@/lib/auth";
import { rateLimit, apiRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  // Apply rate limiting
  const ip = getClientIp(request);
  const limit = rateLimit(ip, apiRateLimit);
  if (!limit.success) {
    return rateLimitResponse(limit.reset - Date.now());
  }

  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agents = await loadAgents();
    return NextResponse.json(agents);
  } catch (error) {
    console.error("Failed to load agents:", error);
    return NextResponse.json(
      { error: "Failed to load agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const ip = getClientIp(request);
  const limit = rateLimit(ip, apiRateLimit);
  if (!limit.success) {
    return rateLimitResponse(limit.reset - Date.now());
  }

  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validationResult = CreateAgentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const agent = await createAgent(validationResult.data);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
