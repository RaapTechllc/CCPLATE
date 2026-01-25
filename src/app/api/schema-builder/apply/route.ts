import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { validateModelName } from "@/lib/schema-builder";
import {
  applyModelToSchema,
  readCurrentSchema,
  modelExists,
} from "@/lib/schema-builder/manager";

const ApplyRequestSchema = z.object({
  modelCode: z.string().min(1, "Model code is required"),
  confirm: z.boolean().refine((val) => val === true, {
    message: "Confirmation required to apply changes",
  }),
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

    const body = await request.json();
    const { modelCode, confirm } = ApplyRequestSchema.parse(body);

    if (!confirm) {
      return NextResponse.json(
        { error: "Confirmation required" },
        { status: 400 }
      );
    }

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
    if (modelExists(currentSchema, modelName)) {
      return NextResponse.json(
        { error: `Model "${modelName}" already exists in the schema` },
        { status: 400 }
      );
    }

    const result = applyModelToSchema(modelCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to apply model" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      modelName,
      backupPath: result.backupPath,
      message: `Model "${modelName}" has been added to schema.prisma. Run "npm run db:migrate" to apply changes.`,
    });
  } catch (error) {
    console.error("Schema apply error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Apply failed" },
      { status: 500 }
    );
  }
}
