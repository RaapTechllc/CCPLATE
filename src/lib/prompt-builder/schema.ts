import { z } from "zod";

export const PromptVariableSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string().optional(),
  required: z.boolean().default(true),
  defaultValue: z.unknown().optional(),
});

export const PromptVersionSchema = z.object({
  id: z.string(),
  version: z.number(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string(),
  variables: z.array(PromptVariableSchema).default([]),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  createdAt: z.coerce.date(),
  notes: z.string().optional(),
});

export const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().default("general"),
  currentVersion: z.number().default(1),
  versions: z.array(PromptVersionSchema).default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PromptsFileSchema = z.object({
  prompts: z.array(PromptSchema).default([]),
});

export type PromptVariable = z.infer<typeof PromptVariableSchema>;
export type PromptVersion = z.infer<typeof PromptVersionSchema>;
export type Prompt = z.infer<typeof PromptSchema>;
export type PromptsFile = z.infer<typeof PromptsFileSchema>;
