import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResponse } from "./types";
import { mapProviderError } from "../errors";

const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: request.model || DEFAULT_MODEL,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        response_format: request.jsonMode ? { type: "json_object" } : undefined,
      });

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
}
