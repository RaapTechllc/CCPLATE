import { z } from "zod";
import type { Tool } from "../schema";

export const webSearchTool: Tool = {
  id: "web-search",
  name: "web_search",
  description: "Search the web for information using Tavily. Returns relevant search results with titles, URLs, and content snippets.",
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
      description: "Maximum number of results to return (default: 5, max: 10)",
      required: false,
    },
  ],
  handler: "builtIn:webSearch",
};

const webSearchArgsSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  response_time: number;
}

export async function executeWebSearch(
  args: Record<string, unknown>
): Promise<{ results: Array<{ title: string; url: string; snippet: string; score?: number }>; error?: string }> {
  const parseResult = webSearchArgsSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      results: [],
      error: `Invalid arguments: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const { query, limit } = parseResult.data;

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      results: [],
      error: "TAVILY_API_KEY not configured. Please add it to your .env file.",
    };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: limit,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        results: [],
        error: `Tavily API error: ${response.status} - ${errorData.detail?.error || response.statusText}`,
      };
    }

    const data: TavilyResponse = await response.json();

    return {
      results: data.results.map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.content.slice(0, 500), // Truncate long content
        score: result.score,
      })),
    };
  } catch (error) {
    return {
      results: [],
      error: `Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
