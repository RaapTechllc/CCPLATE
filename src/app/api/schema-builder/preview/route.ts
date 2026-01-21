import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateModelName } from "@/lib/schema-builder";
import {
  readCurrentSchema,
  previewSchemaChange,
  getExistingModelNames,
} from "@/lib/schema-builder/manager";

const PreviewRequestSchema = z.object({
  modelCode: z.string().min(1, "Model code is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { modelCode } = PreviewRequestSchema.parse(body);

    const modelNameMatch = modelCode.match(/model\s+(\w+)\s*\{/);
    if (!modelNameMatch) {
      return NextResponse.json(
        { error: "Invalid model code: could not extract model name" },
        { status: 400 }
      );
    }

    const modelName = modelNameMatch[1];
    const nameValidation = validateModelName(modelName);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    const currentSchema = readCurrentSchema();
    const existingModels = getExistingModelNames(currentSchema);

    if (existingModels.includes(modelName)) {
      return NextResponse.json(
        { error: `Model "${modelName}" already exists in the schema` },
        { status: 400 }
      );
    }

    const preview = previewSchemaChange(currentSchema, modelCode);

    return NextResponse.json({
      modelName,
      existingModels,
      diff: preview.diff,
      schemaPreview: preview.after,
    });
  } catch (error) {
    console.error("Schema preview error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed" },
      { status: 500 }
    );
  }
}
