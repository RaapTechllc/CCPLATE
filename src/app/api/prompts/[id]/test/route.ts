import { NextRequest, NextResponse } from "next/server";
import { getPrompt, testPrompt } from "@/lib/prompt-builder";
import { rateLimit } from "@/lib/rate-limit";

const aiRateLimit = { interval: 60000, maxRequests: 10 };

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
  const rateLimitResult = rateLimit(`prompt-test:${ip}`, aiRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      variables: Record<string, unknown>;
      versionNumber?: number;
    };

    const prompt = await getPrompt(id);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    const versionNumber = body.versionNumber ?? prompt.currentVersion;
    const version = prompt.versions.find((v) => v.version === versionNumber);

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const result = await testPrompt(version, body.variables || {});

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to test prompt" },
      { status: 500 }
    );
  }
}
