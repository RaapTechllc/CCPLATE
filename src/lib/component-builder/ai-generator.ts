import { completeJson } from "@/lib/ai";
import { ComponentSpecSchema, type ComponentSpec } from "./spec";

const COMPONENT_SYSTEM_PROMPT = `You are a React component generator. Given a description, generate a component specification.

Rules:
- Component names are PascalCase
- Use TypeScript types for props (string, number, boolean, or custom types)
- Prefer Tailwind CSS for styling
- Include loading/error states for data-fetching components
- Make components responsive by default
- For tables/grids, include sorting and pagination features
- For forms, include validation state handling
- For lists, include empty state handling

Output valid JSON matching the ComponentSpec schema with these fields:
- name: PascalCase component name
- description: brief description of what the component does
- type: "client" for interactive components, "server" for static/data-fetching
- props: array of { name, type, required, defaultValue?, description? }
- hasChildren: true if component accepts children
- styling: "tailwind" (default), "css-modules", or "inline"
- features: array of enabled features like "loading-state", "error-state", "empty-state", "pagination", "search", "sorting", "responsive", "dark-mode", "animations"
- dataSource: optional { type: "props" | "fetch" | "hook", endpoint?, hookName? }`;

export interface GenerateComponentOptions {
  type?: "client" | "server";
  styling?: "tailwind" | "css-modules" | "inline";
  features?: string[];
}

export async function generateComponentFromDescription(
  description: string,
  options?: GenerateComponentOptions
): Promise<ComponentSpec> {
  const userPrompt = buildUserPrompt(description, options);

  const spec = await completeJson(ComponentSpecSchema, {
    messages: [
      { role: "system", content: COMPONENT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
  });

  return spec;
}

function buildUserPrompt(description: string, options?: GenerateComponentOptions): string {
  let prompt = `Generate a React component specification for:\n\n${description}`;

  if (options) {
    const constraints: string[] = [];

    if (options.type) {
      constraints.push(`Component type: ${options.type}`);
    }

    if (options.styling) {
      constraints.push(`Styling approach: ${options.styling}`);
    }

    if (options.features && options.features.length > 0) {
      constraints.push(`Required features: ${options.features.join(", ")}`);
    }

    if (constraints.length > 0) {
      prompt += `\n\nConstraints:\n${constraints.join("\n")}`;
    }
  }

  return prompt;
}

export function validateComponentSpec(spec: unknown): ComponentSpec {
  return ComponentSpecSchema.parse(spec);
}
