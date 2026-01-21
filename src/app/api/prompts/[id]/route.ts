import { NextRequest, NextResponse } from "next/server";
import {
  getPrompt,
  updatePrompt,
  deletePrompt,
  restoreVersion,
  type UpdatePromptInput,
} from "@/lib/prompt-builder";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const prompt = await getPrompt(id);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get prompt" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdatePromptInput & { restoreVersion?: number };

    if (body.restoreVersion !== undefined) {
      const prompt = await restoreVersion(id, body.restoreVersion);
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt or version not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ prompt });
    }

    const prompt = await updatePrompt(id, body);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deleted = await deletePrompt(id);

    if (!deleted) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
