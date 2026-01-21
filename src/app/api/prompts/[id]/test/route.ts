import { NextRequest, NextResponse } from "next/server";
import { getPrompt, testPrompt } from "@/lib/prompt-builder";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
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
