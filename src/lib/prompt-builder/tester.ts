import { complete } from "@/lib/ai";
import { renderTemplate } from "@/lib/ai/prompts/template";
import type { PromptVersion, PromptVariable } from "./schema";

export interface TestResult {
  success: boolean;
  response?: string;
  error?: string;
  latencyMs: number;
  tokensUsed?: { input: number; output: number };
}

function coerceVariable(
  value: unknown,
  variable: PromptVariable
): string {
  if (value === undefined || value === null || value === "") {
    if (variable.defaultValue !== undefined) {
      value = variable.defaultValue;
    } else if (variable.required) {
      throw new Error(`Missing required variable: ${variable.name}`);
    } else {
      return "";
    }
  }

  switch (variable.type) {
    case "string":
      return String(value);
    case "number":
      return String(Number(value));
    case "boolean":
      return String(Boolean(value));
    case "array":
    case "object":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return String(value);
  }
}

export async function testPrompt(
  prompt: PromptVersion,
  variables: Record<string, unknown>
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const renderedVariables: Record<string, string> = {};
    for (const variable of prompt.variables) {
      renderedVariables[variable.name] = coerceVariable(
        variables[variable.name],
        variable
      );
    }

    const renderedUserPrompt = renderTemplate(prompt.userPrompt, renderedVariables);
    const renderedSystemPrompt = prompt.systemPrompt
      ? renderTemplate(prompt.systemPrompt, renderedVariables)
      : undefined;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    if (renderedSystemPrompt) {
      messages.push({ role: "system", content: renderedSystemPrompt });
    }
    messages.push({ role: "user", content: renderedUserPrompt });

    const response = await complete({
      model: prompt.model,
      messages,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
    });

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      response: response.text,
      latencyMs,
      tokensUsed: response.usage
        ? { input: response.usage.inputTokens, output: response.usage.outputTokens }
        : undefined,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      latencyMs,
    };
  }
}
