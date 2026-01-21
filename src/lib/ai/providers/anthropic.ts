import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIRequest, AIResponse, AIMessage } from "./types";
import { mapProviderError } from "../errors";

const DEFAULT_MODEL = "claude-3-5-sonnet-latest";

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

      const response = await this.client.messages.create({
        model: request.model || DEFAULT_MODEL,
        max_tokens: request.maxTokens || 4096,
        system: systemMessage?.content,
        messages,
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock && "text" in textBlock ? textBlock.text : "";

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      throw mapProviderError(error, this.name);
    }
  }
}
