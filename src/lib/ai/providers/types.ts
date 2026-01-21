export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIResponse {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface AIProvider {
  name: string;
  complete(request: AIRequest): Promise<AIResponse>;
}
