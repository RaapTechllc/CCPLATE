import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { APISpecSchema, generateFiles, writeAPIFiles, checkFilesExist } from "@/lib/api-builder";
import { HookSpecSchema } from "@/lib/hook-builder";
import { writeHook, checkHookPathExists } from "@/lib/hook-builder/writer";
import { writeComponent, checkPathExists, validateComponentPath } from "@/lib/component-builder/writer";
import { validateModelName } from "@/lib/schema-builder";
import {
  applyModelToSchema,
  readCurrentSchema,
  modelExists,
} from "@/lib/schema-builder/manager";
import { api } from "../../../../../convex/_generated/api";

const HookApplySchema = z.object({
  spec: HookSpecSchema,
  code: z.string().min(1),
  filename: z.string().min(1),
  path: z.string().min(1),
});

const ComponentApplySchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  content: z.string().min(1),
});

const ApplyRequestSchema = z.object({
  featureName: z.string().min(1),
  estimatedMinutesSaved: z.number().optional(),
  schema: z
    .object({
      modelCode: z.string().min(1),
    })
    .optional(),
  api: z
    .object({
      spec: APISpecSchema,
      overwrite: z.boolean().optional().default(false),
    })
    .optional(),
  hooks: z.array(HookApplySchema).optional(),
  components: z.array(ComponentApplySchema).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { authenticated, user, isAdmin, convex } = await requireAdmin();
    if (!authenticated || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const validated = ApplyRequestSchema.parse(body);

    const conflictErrors: Record<string, string[]> = {};

    if (validated.schema) {
      const modelNameMatch = validated.schema.modelCode.match(/model\s+(\w+)\s*\{/);
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
        conflictErrors.schema = [
          `Model \"${modelName}\" already exists in schema.prisma`,
        ];
      }
    }

    if (validated.api && !validated.api.overwrite) {
      const apiFiles = generateFiles(validated.api.spec);
      const existingFiles = checkFilesExist(apiFiles, process.cwd());
      if (existingFiles.length > 0) {
        conflictErrors.api = existingFiles;
      }
    }

    if (validated.hooks && validated.hooks.length > 0) {
      const hookConflicts = validated.hooks
        .filter((hook) => checkHookPathExists(hook.path))
        .map((hook) => hook.path);
      if (hookConflicts.length > 0) {
        conflictErrors.hooks = hookConflicts;
      }
    }

    if (validated.components && validated.components.length > 0) {
      const componentConflicts = validated.components
        .filter((component) => checkPathExists(component.path))
        .map((component) => component.path);
      if (componentConflicts.length > 0) {
        conflictErrors.components = componentConflicts;
      }
    }

    if (Object.keys(conflictErrors).length > 0) {
      return NextResponse.json(
        { error: "Conflicts detected", conflicts: conflictErrors },
        { status: 409 }
      );
    }

    const applied: Record<string, unknown> = {};

    if (validated.schema) {
      const result = applyModelToSchema(validated.schema.modelCode);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to apply schema" },
          { status: 500 }
        );
      }
      applied.schema = {
        backupPath: result.backupPath,
      };
    }

    if (validated.api) {
      const apiFiles = generateFiles(validated.api.spec);
      writeAPIFiles(apiFiles, process.cwd());

      const createdFiles = [apiFiles.routePath];
      if (apiFiles.dynamicRoutePath) {
        createdFiles.push(apiFiles.dynamicRoutePath);
      }

      applied.api = { createdFiles };
    }

    if (validated.hooks && validated.hooks.length > 0) {
      const createdHooks: string[] = [];

      for (const hook of validated.hooks) {
        const result = writeHook({
          spec: hook.spec,
          code: hook.code,
          filename: hook.filename,
          path: hook.path,
        });

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || "Failed to write hook" },
            { status: 500 }
          );
        }

        createdHooks.push(result.fullPath);
      }

      applied.hooks = { createdHooks };
    }

    if (validated.components && validated.components.length > 0) {
      const createdComponents: string[] = [];

      for (const component of validated.components) {
        const validation = validateComponentPath(component.path);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error || "Invalid component path" },
            { status: 400 }
          );
        }

        const result = writeComponent({
          name: component.name,
          path: component.path,
          content: component.content,
        });

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || "Failed to write component" },
            { status: 500 }
          );
        }

        createdComponents.push(result.fullPath);
      }

      applied.components = { createdComponents };
    }

    if (convex) {
      await convex.mutation(api.analytics.logEvent, {
        builder: "feature-builder",
        eventType: "apply",
        featureName: validated.featureName,
        estimatedMinutesSaved: validated.estimatedMinutesSaved,
      });
    }

    return NextResponse.json({ success: true, applied });
  } catch (error) {
    console.error("Feature builder apply error:", error);

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
