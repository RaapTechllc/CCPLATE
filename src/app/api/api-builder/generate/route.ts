import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  createStandardCRUDSpec,
  generateFiles,
  checkFilesExist,
  type APISpec,
} from "@/lib/api-builder";
import { rateLimit } from "@/lib/rate-limit";

const aiRateLimit = { interval: 60000, maxRequests: 10 };

const generateRequestSchema = z.object({
  mode: z.enum(["description", "model"]),
  description: z.string().optional(),
  model: z.string().optional(),
  basePath: z.string().optional(),
  options: z.object({
    auth: z.enum(["none", "required", "admin"]).default("required"),
    pagination: z.boolean().default(true),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = rateLimit(`api-builder:${session.user.id}`, aiRateLimit);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validated = generateRequestSchema.parse(body);

    let spec: APISpec;

    if (validated.mode === "model") {
      if (!validated.model) {
        return NextResponse.json(
          { error: "Model name is required" },
          { status: 400 }
        );
      }
      spec = createStandardCRUDSpec(validated.model, validated.basePath);
    } else {
      if (!validated.description) {
        return NextResponse.json(
          { error: "Description is required" },
          { status: 400 }
        );
      }
      
      const modelName = inferModelName(validated.description);
      spec = createStandardCRUDSpec(modelName, validated.basePath);
    }

    if (validated.options) {
      spec.endpoints = spec.endpoints.map((endpoint) => ({
        ...endpoint,
        auth: validated.options!.auth,
        pagination: endpoint.method === "GET" && !endpoint.path.includes("[id]")
          ? validated.options!.pagination
          : endpoint.pagination,
      }));
    }

    const files = generateFiles(spec);
    const existingFiles = checkFilesExist(files, process.cwd());

    return NextResponse.json({
      spec,
      files,
      existingFiles,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Generate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate API" },
      { status: 500 }
    );
  }
}

function inferModelName(description: string): string {
  const words = description.toLowerCase().split(/\s+/);
  
  const resourceKeywords = ["for", "of", "manage", "managing", "create", "crud"];
  let foundIndex = -1;
  
  for (const keyword of resourceKeywords) {
    const index = words.indexOf(keyword);
    if (index !== -1 && index < words.length - 1) {
      foundIndex = index;
      break;
    }
  }
  
  if (foundIndex !== -1) {
    const resource = words[foundIndex + 1];
    const cleaned = resource.replace(/[^a-z]/g, "");
    const singular = cleaned.endsWith("s") ? cleaned.slice(0, -1) : cleaned;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }
  
  const nouns = words.filter((w) => 
    w.length > 3 && 
    !["create", "crud", "api", "endpoint", "endpoints", "with", "the", "for", "and"].includes(w)
  );
  
  if (nouns.length > 0) {
    const noun = nouns[0].replace(/[^a-z]/g, "");
    const singular = noun.endsWith("s") ? noun.slice(0, -1) : noun;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }
  
  return "Resource";
}
