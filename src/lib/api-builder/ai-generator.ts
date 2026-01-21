import { completeJson } from "@/lib/ai";
import { APISpecSchema, type APISpec } from "./spec";
import { createStandardCRUDSpec } from "./generator";

const API_SPEC_PROMPT = `You are an API specification generator. Generate a complete API specification for the given description.

The spec should include CRUD endpoints (GET list, GET single, POST, PUT, PATCH, DELETE) unless the description specifies otherwise.

Output a valid JSON object matching this schema:
{
  "name": "string - resource name (plural, lowercase)",
  "basePath": "string - base API path like /api/resources",
  "model": "string - Prisma model name (PascalCase)",
  "endpoints": [
    {
      "method": "GET|POST|PUT|PATCH|DELETE",
      "path": "string - full path including [id] for dynamic routes",
      "description": "string - what this endpoint does",
      "auth": "none|required|admin",
      "input": {
        "params": [{ "name": "string", "type": "string", "required": boolean }],
        "query": [{ "name": "string", "type": "string", "required": boolean }],
        "body": "string - type name for body validation"
      },
      "output": "string - response type name",
      "pagination": boolean
    }
  ]
}`;

export async function generateAPIFromDescription(
  description: string,
  modelName?: string
): Promise<APISpec> {
  const userPrompt = modelName
    ? `Generate an API specification for: ${description}\n\nUse the Prisma model name: ${modelName}`
    : `Generate an API specification for: ${description}`;

  const spec = await completeJson(APISpecSchema, {
    messages: [
      { role: "system", content: API_SPEC_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  return spec;
}

export async function generateAPIFromPrismaModel(
  modelDefinition: string
): Promise<APISpec> {
  const modelNameMatch = modelDefinition.match(/model\s+(\w+)\s*\{/);
  if (!modelNameMatch) {
    throw new Error("Could not parse model name from Prisma definition");
  }
  
  const modelName = modelNameMatch[1];
  return createStandardCRUDSpec(modelName);
}

export function parsePrismaSchema(schemaContent: string): string[] {
  const modelRegex = /model\s+(\w+)\s*\{/g;
  const models: string[] = [];
  let match;
  
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push(match[1]);
  }
  
  return models;
}

export function extractModelDefinition(schemaContent: string, modelName: string): string | null {
  const regex = new RegExp(`model\\s+${modelName}\\s*\\{[^}]+\\}`, "s");
  const match = schemaContent.match(regex);
  return match ? match[0] : null;
}
