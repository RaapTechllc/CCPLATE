export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type EffortLevel = "low" | "medium" | "high" | "max";

export interface AIRequest {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** Opus 4.6+ / Codex 5.3+ effort level for adaptive thinking */
  effortLevel?: EffortLevel;
  /** Enable extended thinking (Anthropic) or reasoning tokens (OpenAI o-series) */
  thinking?: {
    enabled: boolean;
    budgetTokens?: number;
  };
}

export interface AIResponse {
  text: string;
  /** Thinking/reasoning content if extended thinking was enabled */
  thinking?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIProvider {
  name: string;
  complete(request: AIRequest): Promise<AIResponse>;
}
