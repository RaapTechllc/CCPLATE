import { z } from "zod";
import type { EffortLevel } from "./providers/types";

const aiConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]).default("openai"),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  googleApiKey: z.string().optional(),
  defaultModel: z.string().optional(),
  /** Default effort level for AI requests (low/medium/high/max) */
  defaultEffortLevel: z
    .enum(["low", "medium", "high", "max"])
    .optional()
    .default("medium"),
  /** Enable extended thinking by default for Anthropic */
  enableThinking: z.boolean().optional().default(false),
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

export function getAIConfig(): AIConfig {
  return aiConfigSchema.parse({
    provider: process.env.AI_PROVIDER,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY,
    defaultModel: process.env.AI_DEFAULT_MODEL,
    defaultEffortLevel: process.env.AI_EFFORT_LEVEL as EffortLevel | undefined,
    enableThinking: process.env.AI_ENABLE_THINKING === "true",
  });
}
