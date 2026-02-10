import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIRequest, AIResponse, AIMessage } from "./types";
import { mapProviderError } from "../errors";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Anthropic AI Provider
 *
 * Supports Opus 4.6 features:
 * - Extended thinking (adaptive reasoning with budget control)
 * - Effort levels mapped to temperature + thinking budget
 * - 128K output tokens for large generation tasks
 */
export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    try {
      const systemMessage = request.messages.find((m) => m.role === "system");
      const nonSystemMessages = request.messages.filter((m) => m.role !== "system");

      const messages = nonSystemMessages.map((m: AIMessage) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Build request parameters
      const maxTokens = request.maxTokens || 4096;

      // Extended thinking support (Opus 4.6+)
      if (request.thinking?.enabled) {
        const budgetTokens = request.thinking.budgetTokens
          ?? this.getThinkingBudget(request.effortLevel);

        const thinkingMaxTokens = Math.max(maxTokens, budgetTokens + 4096);

        const response = await this.client.messages.create({
          model: request.model || DEFAULT_MODEL,
          max_tokens: thinkingMaxTokens,
          system: systemMessage?.content,
          messages,
          temperature: 1, // Required when thinking is enabled
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thinking: { type: "enabled", budget_tokens: budgetTokens } as any,
        });

        return this.extractResponse(response);
      }

      // Standard request (no thinking)
      const response = await this.client.messages.create({
        model: request.model || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: systemMessage?.content,
        messages,
        temperature: request.temperature ?? this.getTemperature(request.effortLevel),
      });

      return this.extractResponse(response);
    } catch (error) {
      throw mapProviderError(error, this.name);
    }
  }

  /**
   * Extract text and thinking content from Anthropic response
   */
  private extractResponse(response: Anthropic.Messages.Message): AIResponse {
    let text = "";
    let thinkingContent = "";

    for (const block of response.content) {
      if (block.type === "thinking" && "thinking" in block) {
        thinkingContent += (block as { type: "thinking"; thinking: string }).thinking;
      } else if (block.type === "text" && "text" in block) {
        text += block.text;
      }
    }

    return {
      text,
      thinking: thinkingContent || undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Map effort level to thinking budget tokens
   * Higher effort = more reasoning tokens allocated
   */
  private getThinkingBudget(effortLevel?: string): number {
    switch (effortLevel) {
      case "low": return 1024;
      case "medium": return 4096;
      case "high": return 16384;
      case "max": return 32768;
      default: return 4096;
    }
  }

  /**
   * Map effort level to temperature
   * Lower effort = lower temperature (more deterministic)
   */
  private getTemperature(effortLevel?: string): number {
    switch (effortLevel) {
      case "low": return 0.3;
      case "medium": return 0.5;
      case "high": return 0.7;
      case "max": return 0.8;
      default: return 0.7;
    }
  }
}
