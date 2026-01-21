import type { AIMessage } from "../providers/types";

export interface PromptTemplate {
  id: string;
  system?: string;
  user: string;
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  const missingVars: string[] = [];

  const rendered = template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    missingVars.push(varName);
    return match;
  });

  if (missingVars.length > 0) {
    throw new Error(`Missing required template variables: ${missingVars.join(", ")}`);
  }

  return rendered;
}

export function buildMessages(
  template: PromptTemplate,
  variables: Record<string, string>
): AIMessage[] {
  const messages: AIMessage[] = [];

  if (template.system) {
    messages.push({
      role: "system",
      content: renderTemplate(template.system, variables),
    });
  }

  messages.push({
    role: "user",
    content: renderTemplate(template.user, variables),
  });

  return messages;
}
