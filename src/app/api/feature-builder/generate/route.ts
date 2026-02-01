import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  generateModelWithContext,
  generatePrismaModel,
  type Model,
} from "@/lib/schema-builder";
import {
  readCurrentSchema,
  getExistingModelNames,
  previewSchemaChange,
} from "@/lib/schema-builder/manager";
import {
  createStandardCRUDSpec,
  generateFiles,
  checkFilesExist,
  type APISpec,
  type Endpoint,
} from "@/lib/api-builder";
import type { HookSpec, HookParam } from "@/lib/hook-builder";
import { generateHookFromSpec } from "@/lib/hook-builder";
import { generateComponentFromDescription } from "@/lib/component-builder";
import { checkPathExists } from "@/lib/component-builder/writer";
import { checkHookPathExists, getHookPath } from "@/lib/hook-builder/writer";
import type {
  FeatureBuilderResponse,
  FeatureComponentOutput,
  FeatureHookOutput,
  FeatureMetrics,
} from "@/lib/feature-builder/types";
import { rateLimit } from "@/lib/rate-limit";
import { api } from "../../../../../convex/_generated/api";

const aiRateLimit = { interval: 60000, maxRequests: 6 };

const GenerateRequestSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  includeSchema: z.boolean().optional().default(true),
  includeApi: z.boolean().optional().default(true),
  includeHooks: z.boolean().optional().default(true),
  includeComponents: z.boolean().optional().default(true),
  apiOptions: z
    .object({
      auth: z.enum(["none", "required", "admin"]).default("required"),
      pagination: z.boolean().default(true),
    })
    .optional(),
  componentPreferences: z
    .object({
      type: z.enum(["client", "server"]).optional(),
      styling: z.enum(["tailwind", "css-modules", "inline"]).optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { authenticated, user, isAdmin, convex } = await requireAdmin();
    if (!authenticated || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const rateLimitResult = rateLimit(`feature-builder:${user._id}`, aiRateLimit);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const validated = GenerateRequestSchema.parse(body);

    const currentSchema = readCurrentSchema();
    const existingModels = getExistingModelNames(currentSchema);

    const model = await generateModelWithContext(
      validated.description,
      existingModels
    );

    const modelCode = generatePrismaModel(model);

    let diff: string;
    try {
      diff = previewSchemaChange(currentSchema, modelCode).diff;
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

    const basePath = buildBasePath(model);
    const apiSpec = buildApiSpec(model, basePath, validated.apiOptions);
    const files = generateFiles(apiSpec);
    const existingFiles = checkFilesExist(files, process.cwd());

    const hooks = validated.includeHooks
      ? buildHookOutputs(apiSpec)
      : [];

    const components = validated.includeComponents
      ? await buildComponentOutputs(model, validated.componentPreferences)
      : [];

    const metrics = buildMetrics({
      includeSchema: validated.includeSchema,
      includeApi: validated.includeApi,
      includeHooks: validated.includeHooks,
      includeComponents: validated.includeComponents,
      hookCount: hooks.length,
      componentCount: components.length,
    });

    const response: FeatureBuilderResponse = {
      featureName: model.name,
      basePath,
      schema: validated.includeSchema
        ? { model, modelCode, diff, existingModels }
        : undefined,
      api: validated.includeApi
        ? { spec: apiSpec, files, existingFiles }
        : undefined,
      hooks: validated.includeHooks ? hooks : undefined,
      components: validated.includeComponents ? components : undefined,
      metrics,
    };

    if (convex) {
      await convex.mutation(api.analytics.logEvent, {
        builder: "feature-builder",
        eventType: "generate",
        featureName: model.name,
        estimatedMinutesSaved: metrics.estimatedMinutesSaved,
        durationMs: Date.now() - startTime,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Feature builder generation error:", error);

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

function buildBasePath(model: Model): string {
  if (model.tableName) {
    return `/api/${model.tableName.replace(/_/g, "-")}`;
  }

  const base = model.name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  return `/api/${base.endsWith("s") ? base : `${base}s`}`;
}

function buildApiSpec(
  model: Model,
  basePath: string,
  apiOptions?: { auth?: "none" | "required" | "admin"; pagination?: boolean }
): APISpec {
  const spec = createStandardCRUDSpec(model.name, basePath);

  if (!apiOptions) {
    return spec;
  }

  return {
    ...spec,
    endpoints: spec.endpoints.map((endpoint) => ({
      ...endpoint,
      auth: apiOptions.auth ?? endpoint.auth,
      pagination:
        endpoint.method === "GET" && !endpoint.path.includes("[id]")
          ? apiOptions.pagination ?? endpoint.pagination
          : endpoint.pagination,
    })),
  };
}

function buildHookOutputs(spec: APISpec): FeatureHookOutput[] {
  return spec.endpoints.map((endpoint) => {
    const hookSpec = buildHookSpec(spec.model, endpoint);
    const output = generateHookFromSpec(hookSpec);
    const suggestedPath = getHookPath(output.filename);

    return {
      ...output,
      suggestedPath,
      exists: checkHookPathExists(suggestedPath),
    };
  });
}

function buildHookSpec(modelName: string, endpoint: Endpoint): HookSpec {
  const isList = endpoint.method === "GET" && !endpoint.path.includes("[id]");
  const isMutation = endpoint.method !== "GET";

  const name = deriveHookName(modelName, endpoint);
  const kind = isMutation ? "mutation" : "query";

  const params: HookParam[] = [];
  if (endpoint.input?.params) {
    params.push(
      ...endpoint.input.params.map((param) => ({
        name: param.name,
        type: param.type,
        location: "path" as const,
        optional: !param.required,
      }))
    );
  }
  if (endpoint.input?.query) {
    params.push(
      ...endpoint.input.query.map((param) => ({
        name: param.name,
        type: param.type,
        location: "query" as const,
        optional: !param.required,
      }))
    );
  }
  if (isList && endpoint.pagination) {
    params.push(
      { name: "page", type: "number", location: "query" as const, optional: true },
      { name: "limit", type: "number", location: "query" as const, optional: true }
    );
  }

  const outputType = isList
    ? `${modelName}ListResponse`
    : `${modelName}Response`;

  return {
    name,
    description: endpoint.description,
    kind,
    endpoint: endpoint.path,
    method: endpoint.method,
    inputType: endpoint.input?.body,
    outputType,
    params,
    pagination: undefined,
    invalidates: isMutation ? [modelName] : [],
  };
}

function deriveHookName(modelName: string, endpoint: Endpoint): string {
  if (endpoint.method === "GET" && !endpoint.path.includes("[id]")) {
    return `use${modelName}List`;
  }
  if (endpoint.method === "GET") {
    return `use${modelName}`;
  }
  if (endpoint.method === "POST") {
    return `useCreate${modelName}`;
  }
  if (endpoint.method === "PUT") {
    return `useUpdate${modelName}`;
  }
  if (endpoint.method === "PATCH") {
    return `usePatch${modelName}`;
  }
  return `useDelete${modelName}`;
}

async function buildComponentOutputs(
  model: Model,
  preferences?: {
    type?: "client" | "server";
    styling?: "tailwind" | "css-modules" | "inline";
    features?: string[];
  }
): Promise<FeatureComponentOutput[]> {
  const listDescription = `A ${model.name} list dashboard with searchable rows, pagination, and loading states.`;
  const formDescription = `A ${model.name} form for creating and editing records with validation and submit actions.`;

  const listComponent = await generateComponentFromDescription({
    description: listDescription,
    preferences: {
      type: preferences?.type ?? "client",
      styling: preferences?.styling ?? "tailwind",
      features: preferences?.features ?? [
        "loading-state",
        "error-state",
        "empty-state",
        "pagination",
        "search",
        "sorting",
        "responsive",
      ],
    },
  });

  const formComponent = await generateComponentFromDescription({
    description: formDescription,
    preferences: {
      type: preferences?.type ?? "client",
      styling: preferences?.styling ?? "tailwind",
      features: preferences?.features ?? [
        "loading-state",
        "error-state",
        "responsive",
      ],
    },
  });

  return [listComponent, formComponent].map((component) => ({
    ...component,
    exists: checkPathExists(component.suggestedPath),
  }));
}

function buildMetrics(options: {
  includeSchema: boolean;
  includeApi: boolean;
  includeHooks: boolean;
  includeComponents: boolean;
  hookCount: number;
  componentCount: number;
}): FeatureMetrics {
  const steps: FeatureMetrics["steps"] = [];

  if (options.includeSchema) {
    steps.push({ step: "schema", minutesSaved: 20 });
  }
  if (options.includeApi) {
    steps.push({ step: "api", minutesSaved: 30 });
  }
  if (options.includeHooks) {
    steps.push({ step: "hooks", minutesSaved: Math.max(10, options.hookCount * 8) });
  }
  if (options.includeComponents) {
    steps.push({ step: "components", minutesSaved: Math.max(20, options.componentCount * 15) });
  }

  const estimatedMinutesSaved = steps.reduce(
    (sum, step) => sum + step.minutesSaved,
    0
  );

  return { estimatedMinutesSaved, steps };
}
