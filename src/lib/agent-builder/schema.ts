import { z } from "zod";

export const ToolParameterSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object"]),
  description: z.string(),
  required: z.boolean().default(true),
});

export const ToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parameters: z.array(ToolParameterSchema).default([]),
  handler: z.string(),
});

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().optional(),
  tools: z.array(ToolSchema).default([]),
  maxIterations: z.number().default(10),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateAgentSchema = AgentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateAgentSchema = CreateAgentSchema.partial();

export type ToolParameter = z.infer<typeof ToolParameterSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
