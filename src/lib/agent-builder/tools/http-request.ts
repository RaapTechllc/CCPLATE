import { z } from "zod";
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

const httpRequestArgsSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
];

const BLOCKED_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isBlockedUrl(urlString: string): { blocked: boolean; reason?: string } {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { blocked: true, reason: `Blocked hostname: ${hostname}` };
    }

    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { blocked: true, reason: `Blocked internal IP: ${hostname}` };
      }
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { blocked: true, reason: `Blocked protocol: ${url.protocol}` };
    }

    return { blocked: false };
  } catch {
    return { blocked: true, reason: "Invalid URL" };
  }
}

export async function executeHttpRequest(
  args: Record<string, unknown>
): Promise<{ status: number; body: string; error?: string }> {
  const parseResult = httpRequestArgsSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      status: 0,
      body: "",
      error: `Invalid arguments: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    };
  }

  const { url, method, headers, body } = parseResult.data;

  const blockCheck = isBlockedUrl(url);
  if (blockCheck.blocked) {
    return {
      status: 0,
      body: "",
      error: `Security: ${blockCheck.reason}`,
    };
  }

  try {
    const response = await fetch(url, {
      method: method || "GET",
      headers,
      body,
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
