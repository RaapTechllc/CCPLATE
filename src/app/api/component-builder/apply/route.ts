import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeComponent, checkPathExists } from "@/lib/component-builder/writer";

const ApplyRequestSchema = z.object({
  name: z.string(),
  path: z.string(),
  content: z.string(),
  force: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, path, content, force } = ApplyRequestSchema.parse(body);

    if (!force && checkPathExists(path)) {
      return NextResponse.json(
        {
          error: "File already exists",
          path,
          requiresForce: true,
        },
        { status: 409 }
      );
    }

    const result = writeComponent({ name, path, content });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, path: result.fullPath },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: result.fullPath,
      message: `Component ${name} written to ${path}`,
    });
  } catch (error) {
    console.error("Component apply error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to apply component" },
      { status: 500 }
    );
  }
}
