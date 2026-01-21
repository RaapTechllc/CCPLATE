import { NextRequest, NextResponse } from "next/server";
import { loadPrompts, createPrompt, type CreatePromptInput } from "@/lib/prompt-builder";

export async function GET() {
  try {
    const prompts = await loadPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load prompts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePromptInput;

    if (!body.name || !body.userPrompt) {
      return NextResponse.json(
        { error: "Name and userPrompt are required" },
        { status: 400 }
      );
    }

    const prompt = await createPrompt(body);
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create prompt" },
      { status: 500 }
    );
  }
}
