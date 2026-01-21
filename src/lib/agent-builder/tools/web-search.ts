import { z } from "zod";
import type { Tool } from "../schema";

export const webSearchTool: Tool = {
  id: "web-search",
  name: "web_search",
  description: "Search the web for information. Returns relevant search results with titles and snippets.",
  parameters: [
    {
      name: "query",
      type: "string",
      description: "The search query to find information",
      required: true,
    },
    {
      name: "limit",
      type: "number",
      description: "Maximum number of results to return (default: 5, max: 20)",
      required: false,
    },
  ],
  handler: "builtIn:webSearch",
};

const webSearchArgsSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

export async function executeWebSearch(
  args: Record<string, unknown>
): Promise<{ results: Array<{ title: string; url: string; snippet: string }>; error?: string }> {
  const parseResult = webSearchArgsSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      results: [],
      error: `Invalid arguments: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const { query, limit } = parseResult.data;

  return {
    results: [
      {
        title: `Search result for: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `This is a mock search result for "${query}" (limit: ${limit}). Implement actual search integration.`,
      },
    ],
  };
}
