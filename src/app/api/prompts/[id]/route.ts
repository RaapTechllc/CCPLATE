import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

const updatePromptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  variables: z.array(z.object({
    name: z.string().min(1),
    type: z.enum(["string", "number", "boolean", "array", "object"]),
    description: z.string().optional(),
    required: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
  })).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  notes: z.string().optional(),
  restoreVersion: z.number().int().positive().optional(),
});

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdatePromptInput & { restoreVersion?: number };
    const validated = updatePromptSchema.parse(body);

    if (validated.restoreVersion !== undefined) {
      const prompt = await restoreVersion(id, validated.restoreVersion);
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt or version not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ prompt });
    }

    const { restoreVersion: _restoreVersion, ...updateInput } = validated;
    const prompt = await updatePrompt(id, updateInput as UpdatePromptInput);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update prompt" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
