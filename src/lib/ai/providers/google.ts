import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, AIRequest, AIResponse } from "./types";
import { mapProviderError } from "../errors";

const DEFAULT_MODEL = "gemini-2.5-pro";

/**
 * Google AI Provider (Gemini)
 *
 * Supports Gemini 2.5 features:
 * - Advanced reasoning and long context
 * - JSON mode for structured output
 * - Temperature control
 * - Token usage tracking
 */
export class GoogleProvider implements AIProvider {
  name = "google";
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    try {
      const modelName = request.model || DEFAULT_MODEL;
      const model = this.client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
          ...(request.jsonMode && { responseMimeType: "application/json" }),
        },
      });

      // Convert messages to Gemini format
      // Gemini uses 'user' and 'model' roles; system messages become first user message
      const contents = this.convertMessages(request.messages);

      const result = await model.generateContent({
        contents,
      });

      const response = result.response;
      const text = response.text();

      // Extract usage metadata if available
      const usage = response.usageMetadata;

      return {
        text,
        usage: usage
          ? {
              inputTokens: usage.promptTokenCount || 0,
              outputTokens: usage.candidatesTokenCount || 0,
            }
          : undefined,
      };
    } catch (error) {
      throw mapProviderError(error, this.name);
    }
  }

  /**
   * Convert standard AIMessage format to Gemini's content format
   * - System messages are prepended to first user message
   * - 'assistant' role maps to 'model' in Gemini
   */
  private convertMessages(messages: AIRequest["messages"]) {
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    const systemPrefix =
      systemMessages.length > 0
        ? systemMessages.map((m) => m.content).join("\n\n") + "\n\n"
        : "";

    return conversationMessages.map((msg, index) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [
        {
          text:
            index === 0 && systemPrefix
              ? systemPrefix + msg.content
              : msg.content,
        },
      ],
    }));
  }
}
