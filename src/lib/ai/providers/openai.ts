import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResponse } from "./types";
import { mapProviderError } from "../errors";

const DEFAULT_MODEL = "gpt-4o-mini";

/**
 * OpenAI AI Provider
 *
 * Supports Codex 5.3 / o-series features:
 * - Reasoning tokens via reasoning_effort parameter
 * - Effort level mapping to model intelligence/speed tradeoff
 * - JSON mode for structured output
 */
export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    try {
      const model = request.model || DEFAULT_MODEL;
      const isReasoningModel = this.isReasoningModel(model);

      const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: request.maxTokens,
        response_format: request.jsonMode ? { type: "json_object" } : undefined,
      };

      // Reasoning models (o1, o3, codex) use reasoning_effort instead of temperature
      if (isReasoningModel && request.effortLevel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any).reasoning_effort = request.effortLevel;
      } else {
        params.temperature = request.temperature ?? 0.7;
      }

      const response = await this.client.chat.completions.create(params);

      const choice = response.choices[0];
      const text = choice?.message?.content || "";

      return {
        text,
        usage: response.usage
          ? {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
          }
          : undefined,
      };
    } catch (error) {
      throw mapProviderError(error, this.name);
    }
  }

  /**
   * Check if model supports reasoning_effort parameter
   * Applies to o1, o3, o4-mini, codex series models
   */
  private isReasoningModel(model: string): boolean {
    return /^(o[1-4]|codex)/.test(model);
  }
}
