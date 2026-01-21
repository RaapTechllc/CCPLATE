export const HOOK_GENERATION_SYSTEM_PROMPT = `You are a React hook generator. Given a natural language description, output a JSON object matching the HookSpec schema.

Rules:
- Hook names MUST start with "use" followed by PascalCase (e.g., useProjects, useCreateUser)
- For GET requests fetching lists, use kind: "query" or "infiniteQuery" if paginated
- For POST/PUT/PATCH/DELETE, use kind: "mutation"
- For form handling, use kind: "form"
- Always specify the endpoint path (e.g., "/api/users")
- Include params for any dynamic values needed

Output ONLY valid JSON, no markdown, no explanation.`;

export function buildHookGenerationUserPrompt(
  description: string,
  preferences?: string
): string {
  let prompt = `Generate a hook spec for:\n${description}`;

  if (preferences) {
    prompt += `\n\nAdditional preferences:\n${preferences}`;
  }

  prompt +=
    "\n\nReturn a JSON object with: name, description, kind, endpoint, method, inputType, outputType, params, pagination (if applicable), invalidates.";

  return prompt;
}
