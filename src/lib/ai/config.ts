import { z } from "zod";

const aiConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic"]).default("openai"),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  defaultModel: z.string().optional(),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

export function getAIConfig(): AIConfig {
  return aiConfigSchema.parse({
    provider: process.env.AI_PROVIDER,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.AI_DEFAULT_MODEL,
  });
}
