import { ComponentSpecSchema, type ComponentSpec } from "./spec";
import { generateComponent, suggestPath, suggestFilename, detectTemplate, type ComponentTemplate } from "./generator";

export interface ComponentBuilderInput {
  description: string;
  preferences?: {
    type?: "client" | "server";
    styling?: "tailwind" | "css-modules" | "inline";
    features?: string[];
  };
}

export interface ComponentBuilderOutput {
  spec: ComponentSpec;
  code: string;
  filename: string;
  suggestedPath: string;
  template: ComponentTemplate;
}

export async function generateComponentFromDescription(
  input: ComponentBuilderInput
): Promise<ComponentBuilderOutput> {
  const { generateComponentFromDescription: aiGenerate } = await import("./ai-generator");
  
  const spec = await aiGenerate(input.description, input.preferences);
  const template = detectTemplate(spec);
  const code = generateComponent(spec, template);
  const filename = suggestFilename(spec);
  const suggestedPath = suggestPath(spec);
  
  return { spec, code, filename, suggestedPath, template };
}

export function generateComponentFromSpec(
  spec: ComponentSpec,
  template?: ComponentTemplate
): ComponentBuilderOutput {
  const validatedSpec = ComponentSpecSchema.parse(spec);
  const detectedTemplate = template || detectTemplate(validatedSpec);
  const code = generateComponent(validatedSpec, detectedTemplate);
  const filename = suggestFilename(validatedSpec);
  const suggestedPath = suggestPath(validatedSpec);
  
  return {
    spec: validatedSpec,
    code,
    filename,
    suggestedPath,
    template: detectedTemplate,
  };
}

export function validateSpec(spec: unknown): ComponentSpec {
  return ComponentSpecSchema.parse(spec);
}

export { ComponentSpecSchema, type ComponentSpec, type Prop } from "./spec";
export { generateComponent, suggestPath, suggestFilename, detectTemplate, type ComponentTemplate } from "./generator";
export { generateComponentFromDescription as aiGenerateComponent, validateComponentSpec } from "./ai-generator";
