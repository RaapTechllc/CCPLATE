import { z } from "zod";
import { getAIConfig } from "./config";
import { OpenAIProvider, AnthropicProvider } from "./providers";
import type { AIProvider, AIRequest, AIResponse } from "./providers/types";
import { AIError } from "./errors";
import { withRetry } from "./retry";
import { parseWithSchema } from "./parsing/zod";

export function getAIClient(): AIProvider {
  const config = getAIConfig();

  if (config.provider === "anthropic") {
    if (!config.anthropicApiKey) {
      throw new AIError(
        "ANTHROPIC_API_KEY is required when AI_PROVIDER is anthropic",
        "MISSING_API_KEY"
      );
    }
    return new AnthropicProvider(config.anthropicApiKey);
  }

  if (!config.openaiApiKey) {
    throw new AIError(
      "OPENAI_API_KEY is required when AI_PROVIDER is openai",
      "MISSING_API_KEY"
    );
  }
  return new OpenAIProvider(config.openaiApiKey);
}

export async function complete(request: AIRequest): Promise<AIResponse> {
  const client = getAIClient();
  const config = getAIConfig();

  const requestWithModel: AIRequest = {
    ...request,
    model: request.model || config.defaultModel,
  };

  return withRetry(() => client.complete(requestWithModel));
}

export async function completeJson<T extends z.ZodSchema>(
  schema: T,
  request: Omit<AIRequest, "jsonMode">
): Promise<z.infer<T>> {
  const response = await complete({
    ...request,
    jsonMode: true,
  });

  return parseWithSchema(response.text, schema);
}

export { AIError, isRetryableError } from "./errors";
export { withRetry } from "./retry";
export { renderTemplate, buildMessages } from "./prompts/template";
export { extractJsonFromText, safeJsonParse, parseWithSchema } from "./parsing";
export type { AIProvider, AIRequest, AIResponse, AIMessage } from "./providers/types";
export type { AIConfig } from "./config";
export type { PromptTemplate } from "./prompts/template";
