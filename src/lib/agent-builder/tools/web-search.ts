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
      description: "Maximum number of results to return (default: 5)",
      required: false,
    },
  ],
  handler: "builtIn:webSearch",
};

export async function executeWebSearch(args: {
  query: string;
  limit?: number;
}): Promise<{ results: Array<{ title: string; url: string; snippet: string }> }> {
  return {
    results: [
      {
        title: `Search result for: ${args.query}`,
        url: `https://example.com/search?q=${encodeURIComponent(args.query)}`,
        snippet: `This is a mock search result for "${args.query}". Implement actual search integration.`,
      },
    ],
  };
}
