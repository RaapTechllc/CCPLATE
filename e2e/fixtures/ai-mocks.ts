/**
 * AI Builder Mock Fixtures
 *
 * Provides mock responses for AI builder APIs during E2E testing.
 * These mocks allow tests to run without requiring real API keys.
 *
 * Usage:
 *   - Import helpers and call setupAIMocks(page) before navigating
 *   - Use mock data constants for assertions
 */

import { Page, Route } from "@playwright/test";

// =============================================================================
// Mock Response Data
// =============================================================================

/**
 * Component Builder - Mock generated component output
 */
export const MOCK_COMPONENT_RESPONSE = {
  spec: {
    name: "UserCard",
    description: "A card displaying user information",
    props: [
      { name: "name", type: "string", required: true, description: "User's display name" },
      { name: "email", type: "string", required: true, description: "User's email address" },
      { name: "avatarUrl", type: "string", required: false, description: "URL to user's avatar" },
    ],
    type: "client",
    styling: "tailwind",
    features: ["hover-effects"],
  },
  code: `"use client";

import React from "react";

interface UserCardProps {
  name: string;
  email: string;
  avatarUrl?: string;
}

export function UserCard({ name, email, avatarUrl }: UserCardProps) {
  return (
    <div className="rounded-lg border p-4 hover:shadow-md transition-shadow">
      {avatarUrl && (
        <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full" />
      )}
      <h3 className="font-semibold">{name}</h3>
      <p className="text-sm text-gray-600">{email}</p>
    </div>
  );
}
`,
  filename: "UserCard.tsx",
  suggestedPath: "src/components/UserCard.tsx",
  template: "client-component",
};

/**
 * Schema Builder - Mock generated Prisma model output
 */
export const MOCK_SCHEMA_RESPONSE = {
  model: {
    name: "BlogPost",
    fields: [
      { name: "id", type: "String", isId: true, default: "uuid()" },
      { name: "title", type: "String", isRequired: true },
      { name: "content", type: "String", isRequired: true },
      { name: "published", type: "Boolean", default: "false" },
      { name: "authorId", type: "String", isRequired: true },
      { name: "createdAt", type: "DateTime", default: "now()" },
      { name: "updatedAt", type: "DateTime", updatedAt: true },
    ],
    relations: [
      { name: "author", model: "User", fields: ["authorId"], references: ["id"] },
    ],
  },
  modelCode: `model BlogPost {
  id        String   @id @default(uuid())
  title     String
  content   String
  published Boolean  @default(false)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  author User @relation(fields: [authorId], references: [id])
}
`,
  diff: `+ model BlogPost {
+   id        String   @id @default(uuid())
+   title     String
+   content   String
+   published Boolean  @default(false)
+   authorId  String
+   createdAt DateTime @default(now())
+   updatedAt DateTime @updatedAt
+
+   author User @relation(fields: [authorId], references: [id])
+ }`,
  existingModels: ["User", "Account", "Session"],
};

/**
 * API Builder - Mock generated API endpoint files
 */
export const MOCK_API_RESPONSE = {
  spec: {
    basePath: "/api/posts",
    modelName: "Post",
    endpoints: [
      { method: "GET", path: "/api/posts", auth: "required", pagination: true },
      { method: "POST", path: "/api/posts", auth: "required", pagination: false },
      { method: "GET", path: "/api/posts/[id]", auth: "required", pagination: false },
      { method: "PUT", path: "/api/posts/[id]", auth: "required", pagination: false },
      { method: "DELETE", path: "/api/posts/[id]", auth: "admin", pagination: false },
    ],
  },
  files: [
    {
      path: "src/app/api/posts/route.ts",
      content: `import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await prisma.post.findMany();
  return NextResponse.json({ data: posts });
}

export async function POST(request: NextRequest) {
  const { authenticated, user } = await requireAuth();
  if (!authenticated || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const post = await prisma.post.create({ data: body });
  return NextResponse.json({ data: post }, { status: 201 });
}
`,
    },
    {
      path: "src/app/api/posts/[id]/route.ts",
      content: `import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });

  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: post });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { authenticated } = await requireAuth();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const post = await prisma.post.update({ where: { id }, data: body });

  return NextResponse.json({ data: post });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { authenticated, isAdmin } = await requireAdmin();
  if (!authenticated || !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.post.delete({ where: { id } });

  return NextResponse.json({ success: true }, { status: 200 });
}
`,
    },
  ],
  existingFiles: [],
};

/**
 * Agent Execution - Mock agent run result
 */
export const MOCK_AGENT_RUN_RESPONSE = {
  success: true,
  messages: [
    { role: "user", content: "Analyze this code for issues" },
    {
      role: "assistant",
      content: "I'll analyze the code for potential issues.\n\n<tool_call>\n{\"name\": \"analyze_code\", \"arguments\": {\"code\": \"...\"}}\n</tool_call>",
      toolCall: { name: "analyze_code", arguments: { code: "..." } },
    },
    {
      role: "tool",
      content: "{\"issues\": [{\"type\": \"warning\", \"message\": \"Unused variable\"}]}",
      toolResult: { name: "analyze_code", result: { issues: [{ type: "warning", message: "Unused variable" }] } },
    },
    {
      role: "assistant",
      content: "Based on my analysis, I found one issue:\n\n1. **Warning**: Unused variable detected.\n\nI recommend removing unused variables to keep the code clean.",
    },
  ],
  finalResponse: "Based on my analysis, I found one issue:\n\n1. **Warning**: Unused variable detected.\n\nI recommend removing unused variables to keep the code clean.",
  iterations: 2,
};

/**
 * Mock agent data for listing/getting
 */
export const MOCK_AGENT = {
  id: "test-agent-001",
  name: "Code Analyzer",
  description: "Analyzes code for issues and suggests improvements",
  systemPrompt: "You are a code analysis assistant. Analyze code for bugs, style issues, and potential improvements.",
  model: "claude-sonnet-4-20250514",
  temperature: 0.3,
  maxTokens: 4096,
  maxIterations: 5,
  tools: [
    {
      name: "analyze_code",
      description: "Analyze code for issues",
      handler: "codeAnalyzer",
      parameters: [
        { name: "code", type: "string", required: true, description: "The code to analyze" },
      ],
    },
  ],
  createdAt: "2026-01-25T10:00:00Z",
  updatedAt: "2026-01-25T10:00:00Z",
};

// =============================================================================
// Route Interception Helpers
// =============================================================================

/**
 * Setup all AI builder API mocks for a page
 * Call this before navigating to any builder page
 */
export async function setupAIMocks(page: Page): Promise<void> {
  // Component builder
  await page.route("**/api/component-builder/generate", async (route) => {
    await mockJsonResponse(route, MOCK_COMPONENT_RESPONSE);
  });

  // Schema builder
  await page.route("**/api/schema-builder/generate", async (route) => {
    await mockJsonResponse(route, MOCK_SCHEMA_RESPONSE);
  });

  await page.route("**/api/schema-builder/preview", async (route) => {
    await mockJsonResponse(route, { diff: MOCK_SCHEMA_RESPONSE.diff, valid: true });
  });

  // API builder
  await page.route("**/api/api-builder/generate", async (route) => {
    await mockJsonResponse(route, MOCK_API_RESPONSE);
  });

  // Agent APIs
  await page.route("**/api/agents", async (route) => {
    if (route.request().method() === "GET") {
      await mockJsonResponse(route, { agents: [MOCK_AGENT] });
    } else if (route.request().method() === "POST") {
      await mockJsonResponse(route, MOCK_AGENT, 201);
    } else {
      await route.continue();
    }
  });

  await page.route("**/api/agents/*/run", async (route) => {
    await mockJsonResponse(route, MOCK_AGENT_RUN_RESPONSE);
  });

  await page.route("**/api/agents/*", async (route) => {
    if (route.request().method() === "GET") {
      await mockJsonResponse(route, MOCK_AGENT);
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup mocks that simulate authentication being present
 * Use with setupAIMocks for testing authenticated flows
 */
export async function setupAuthenticatedMocks(page: Page): Promise<void> {
  // Mock session endpoint to return authenticated user
  await page.route("**/api/auth/session", async (route) => {
    await mockJsonResponse(route, {
      user: {
        id: "test-user-001",
        name: "Test User",
        email: "test@example.com",
        isAdmin: true,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });
}

/**
 * Setup mocks for error scenarios
 */
export async function setupErrorMocks(page: Page): Promise<void> {
  await page.route("**/api/component-builder/generate", async (route) => {
    await mockJsonResponse(route, { error: "AI service unavailable" }, 503);
  });

  await page.route("**/api/schema-builder/generate", async (route) => {
    await mockJsonResponse(route, { error: "Generation failed" }, 500);
  });

  await page.route("**/api/api-builder/generate", async (route) => {
    await mockJsonResponse(route, { error: "Rate limit exceeded" }, 429);
  });

  await page.route("**/api/agents/*/run", async (route) => {
    await mockJsonResponse(route, {
      success: false,
      messages: [],
      finalResponse: "",
      iterations: 0,
      error: "Agent execution timeout",
    });
  });
}

/**
 * Setup mocks for validation error scenarios
 */
export async function setupValidationErrorMocks(page: Page): Promise<void> {
  await page.route("**/api/component-builder/generate", async (route) => {
    await mockJsonResponse(route, {
      error: "Invalid request",
      details: [
        { path: ["description"], message: "Description is required" },
      ],
    }, 400);
  });

  await page.route("**/api/schema-builder/generate", async (route) => {
    await mockJsonResponse(route, {
      error: "Invalid request",
      details: [
        { path: ["description"], message: "Description must be at least 10 characters" },
      ],
    }, 400);
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to fulfill a route with a JSON response
 */
async function mockJsonResponse(
  route: Route,
  body: unknown,
  status = 200
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/**
 * Helper to simulate network delay
 */
export async function setupDelayedMocks(page: Page, delayMs = 1000): Promise<void> {
  await page.route("**/api/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.continue();
  });
}

/**
 * Assertion helpers - code snippets to look for in responses
 */
export const CODE_SNIPPETS = {
  component: {
    useClient: '"use client"',
    interfaceProps: "interface UserCardProps",
    exportFunction: "export function UserCard",
    tailwindClass: "className=",
  },
  schema: {
    modelKeyword: "model BlogPost",
    idField: "@id @default(uuid())",
    relation: "@relation",
    timestamps: "@updatedAt",
  },
  api: {
    nextRequest: "NextRequest",
    nextResponse: "NextResponse",
    requireAuth: "requireAuth",
    prismaCall: "prisma.",
  },
};
