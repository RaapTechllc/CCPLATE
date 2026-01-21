import type { Tool } from "../schema";

export const httpRequestTool: Tool = {
  id: "http-request",
  name: "http_request",
  description: "Make an HTTP request to a URL and return the response.",
  parameters: [
    {
      name: "url",
      type: "string",
      description: "The URL to make the request to",
      required: true,
    },
    {
      name: "method",
      type: "string",
      description: "HTTP method (GET, POST, PUT, DELETE). Defaults to GET.",
      required: false,
    },
    {
      name: "headers",
      type: "object",
      description: "Optional headers to include in the request",
      required: false,
    },
    {
      name: "body",
      type: "string",
      description: "Optional request body for POST/PUT requests",
      required: false,
    },
  ],
  handler: "builtIn:httpRequest",
};

export async function executeHttpRequest(args: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string; error?: string }> {
  try {
    const response = await fetch(args.url, {
      method: args.method || "GET",
      headers: args.headers,
      body: args.body,
    });

    const text = await response.text();
    return {
      status: response.status,
      body: text.slice(0, 10000),
    };
  } catch (error) {
    return {
      status: 0,
      body: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
