import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/agent-builder/storage";
import { runAgent } from "@/lib/agent-builder/runtime";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const RunAgentSchema = z.object({
  input: z.string().min(1, "Input is required"),
  context: z.record(z.unknown()).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const agent = await getAgent(id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const validationResult = RunAgentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { input, context } = validationResult.data;
    const result = await runAgent(agent, input, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to run agent:", error);
    return NextResponse.json(
      { error: "Failed to run agent" },
      { status: 500 }
    );
  }
}
