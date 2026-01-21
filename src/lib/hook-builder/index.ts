import { HookSpecSchema, HookSpec } from "./spec";
import { renderHook } from "./render";
import { completeJson } from "@/lib/ai";

export interface HookBuilderInput {
  description: string;
  preferences?: string;
}

export interface HookBuilderOutput {
  spec: HookSpec;
  code: string;
  filename: string;
}

const HOOK_GENERATION_PROMPT = `You are a React hook generator. Based on the user's description, generate a specification for a React Query hook.

Generate a hook specification with the following structure:
- name: The hook name (must start with "use", e.g., "useGetUsers")
- description: A brief description of what the hook does
- type: Either "query" or "mutation"
- endpoint: The API endpoint to call (e.g., "/api/users")
- method: HTTP method (GET, POST, PUT, DELETE, PATCH)
- params: Array of parameters with name, type, required, and optional description
- returnType: TypeScript type for the response data (e.g., "User[]", "{ id: string; name: string }")

User description: {{description}}
{{#if preferences}}
Additional preferences: {{preferences}}
{{/if}}

Return ONLY a valid JSON object matching this schema. Do not include markdown code blocks or any other text.`;

export async function generateHook(
  input: HookBuilderInput
): Promise<HookBuilderOutput> {
  const prompt = HOOK_GENERATION_PROMPT
    .replace("{{description}}", input.description)
    .replace("{{#if preferences}}", input.preferences ? "" : "<!--")
    .replace("{{preferences}}", input.preferences || "")
    .replace("{{/if}}", input.preferences ? "" : "-->");

  const spec = await completeJson(HookSpecSchema, {
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const code = renderHook(spec);
  const filename = `${toKebabCase(spec.name)}.ts`;
  return { spec, code, filename };
}

export function generateHookFromSpec(spec: HookSpec): HookBuilderOutput {
  const validatedSpec = HookSpecSchema.parse(spec);
  const code = renderHook(validatedSpec);
  const filename = `${toKebabCase(validatedSpec.name)}.ts`;
  return { spec: validatedSpec, code, filename };
}

export function validateSpec(spec: unknown): HookSpec {
  return HookSpecSchema.parse(spec);
}

function toKebabCase(str: string): string {
  return str
    .replace(/^use/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export { HookSpecSchema, type HookSpec, type HookParam } from "./spec";
export { renderHook } from "./render";
