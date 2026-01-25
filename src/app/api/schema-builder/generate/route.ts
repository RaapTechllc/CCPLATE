import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  generateModelFromDescription,
  generatePrismaModel,
} from "@/lib/schema-builder";
import {
  readCurrentSchema,
  getExistingModelNames,
  previewSchemaChange,
} from "@/lib/schema-builder/manager";
import { rateLimit } from "@/lib/rate-limit";

const aiRateLimit = { interval: 60000, maxRequests: 10 };

const GenerateRequestSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const { authenticated, user, isAdmin } = await requireAdmin();
    if (!authenticated || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const rateLimitResult = rateLimit(`schema-builder:${user._id}`, aiRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const { description } = GenerateRequestSchema.parse(body);

    const currentSchema = readCurrentSchema();
    const existingModels = getExistingModelNames(currentSchema);

    const model = await generateModelFromDescription(description);

    const modelCode = generatePrismaModel(model);

    let preview;
    try {
      preview = previewSchemaChange(currentSchema, modelCode);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Preview failed",
          model,
          modelCode,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      model,
      modelCode,
      diff: preview.diff,
      existingModels,
    });
  } catch (error) {
    console.error("Schema generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
