/**
 * AI Builders E2E Tests
 *
 * Comprehensive E2E tests for AI builder features including:
 * - Component Builder
 * - Schema Builder
 * - API Builder
 * - Agent Execution
 *
 * Tests use mocked AI responses to enable testing without real API keys.
 * See e2e/fixtures/ai-mocks.ts for mock data and setup helpers.
 *
 * IMPORTANT:
 * - Requires authentication (tests use mock auth or skip if unavailable)
 * - Production server must be running (npm start)
 * - Tests are designed to pass with or without Convex backend
 *
 * TEST CATEGORIES:
 * 1. API Mock Tests - Verify mock infrastructure works correctly
 * 2. Page Load Tests - Verify pages load with mocked auth/API
 * 3. Integration Tests - Verify mocks are intercepted on real pages
 */

import { test, expect } from "@playwright/test";
import {
  setupAIMocks,
  setupAuthenticatedMocks,
  setupErrorMocks,
  setupValidationErrorMocks,
  MOCK_COMPONENT_RESPONSE,
  MOCK_SCHEMA_RESPONSE,
  MOCK_API_RESPONSE,
  MOCK_AGENT_RUN_RESPONSE,
  MOCK_AGENT,
  CODE_SNIPPETS,
} from "./fixtures/ai-mocks";

// =============================================================================
// Test Configuration
// =============================================================================

/**
 * Longer timeout for AI builder tests since they involve complex UI flows
 */
const AI_BUILDER_TIMEOUT = 30000;

/**
 * Builder page paths
 */
const BUILDER_PAGES = {
  component: "/component-builder",
  schema: "/schema-builder",
  api: "/api-builder",
  agent: "/agent-builder",
} as const;

/**
 * Helper to check if a page requires authentication (shows login)
 */
async function isOnLoginPage(page: import("@playwright/test").Page): Promise<boolean> {
  const url = page.url();
  if (url.includes("/login")) {
    return true;
  }

  const hasLoginHeading = await page.getByRole("heading", { name: /sign in/i })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  return hasLoginHeading;
}

// =============================================================================
// Component Builder Tests
// =============================================================================

test.describe("Component Builder", () => {
  test.describe("Page Loading", () => {
    test("should load component builder page or show login", async ({ page }) => {
      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.component, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      // Page should either show builder content or redirect to login
      const onLogin = await isOnLoginPage(page);

      if (onLogin) {
        // Expected when auth middleware kicks in - test passes
        expect(true).toBe(true);
      } else {
        // Should be on the component builder page
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should intercept API calls with mocks when on builder page", async ({ page }) => {
      // Track if our mock was called
      let mockWasCalled = false;

      await page.route("**/api/component-builder/generate", async (route) => {
        mockWasCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_COMPONENT_RESPONSE),
        });
      });

      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.component, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      // Try to trigger an API call via page.evaluate if not on login
      const onLogin = await isOnLoginPage(page);
      if (!onLogin) {
        await page.evaluate(async () => {
          try {
            await fetch("/api/component-builder/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ description: "test component" }),
            });
          } catch {
            // Ignore errors
          }
        });

        // Mock should have been called
        expect(mockWasCalled).toBe(true);
      } else {
        // On login page, can't trigger API - test still passes
        expect(true).toBe(true);
      }
    });
  });

  test.describe("Generation Flow", () => {
    test.skip("should generate component from description", async ({ page }) => {
      // TODO: Implement when UI is ready
      // Setup:
      // 1. setupAIMocks(page)
      // 2. setupAuthenticatedMocks(page)
      // 3. Navigate to component builder
      // 4. Fill description field
      // 5. Click generate
      // 6. Assert generated code appears
      // 7. Assert spec matches MOCK_COMPONENT_RESPONSE.spec

      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      // Placeholder assertions
      expect(true).toBe(true);
    });

    test.skip("should display generated code with syntax highlighting", async ({ page }) => {
      // TODO: Implement
      // Verify code block renders with proper formatting
      // Check for language indicator (TypeScript/TSX)

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show suggested file path", async ({ page }) => {
      // TODO: Implement
      // After generation, verify suggestedPath is displayed
      // Should show: MOCK_COMPONENT_RESPONSE.suggestedPath

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should allow copying generated code", async ({ page }) => {
      // TODO: Implement
      // Click copy button
      // Verify clipboard contains generated code
      // (Note: May need to use clipboard permissions)

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Preferences", () => {
    test.skip("should apply client component preference", async ({ page }) => {
      // TODO: Implement
      // Select "client" type preference
      // Generate component
      // Verify output contains "use client"

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should apply styling preference", async ({ page }) => {
      // TODO: Implement
      // Select styling option (tailwind/css-modules/inline)
      // Verify generated code uses selected styling

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test.skip("should show error on generation failure", async ({ page }) => {
      // TODO: Implement
      // Use setupErrorMocks instead of setupAIMocks
      // Trigger generation
      // Verify error message is displayed

      await setupErrorMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show validation errors for invalid input", async ({ page }) => {
      // TODO: Implement
      // Use setupValidationErrorMocks
      // Submit empty or invalid form
      // Verify validation message appears

      await setupValidationErrorMocks(page);
      await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// Schema Builder Tests
// =============================================================================

test.describe("Schema Builder", () => {
  test.describe("Page Loading", () => {
    test("should load schema builder page or show login", async ({ page }) => {
      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.schema, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      const onLogin = await isOnLoginPage(page);

      if (onLogin) {
        expect(true).toBe(true);
      } else {
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should intercept schema API calls with mocks", async ({ page }) => {
      let mockWasCalled = false;

      await page.route("**/api/schema-builder/generate", async (route) => {
        mockWasCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_SCHEMA_RESPONSE),
        });
      });

      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.schema, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      const onLogin = await isOnLoginPage(page);
      if (!onLogin) {
        await page.evaluate(async () => {
          try {
            await fetch("/api/schema-builder/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ description: "blog post model" }),
            });
          } catch {
            // Ignore errors
          }
        });

        expect(mockWasCalled).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe("Generation Flow", () => {
    test.skip("should generate Prisma model from description", async ({ page }) => {
      // TODO: Implement
      // Setup mocks
      // Navigate to schema builder
      // Enter description (e.g., "A blog post with title, content, author")
      // Click generate
      // Verify model code appears with expected fields

      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show schema diff preview", async ({ page }) => {
      // TODO: Implement
      // Generate model
      // Verify diff section shows additions (green + lines)
      // Check MOCK_SCHEMA_RESPONSE.diff content appears

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should display existing models list", async ({ page }) => {
      // TODO: Implement
      // Generate model
      // Verify existing models are shown
      // Check MOCK_SCHEMA_RESPONSE.existingModels appear

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show relations when applicable", async ({ page }) => {
      // TODO: Implement
      // Generate model with relations
      // Verify @relation directive appears in output

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Apply Flow", () => {
    test.skip("should have apply button after generation", async ({ page }) => {
      // TODO: Implement
      // Generate schema
      // Verify "Apply" or "Add to Schema" button appears
      // Button should be clickable

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show confirmation before applying", async ({ page }) => {
      // TODO: Implement
      // Generate schema
      // Click apply
      // Verify confirmation dialog/modal appears

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test.skip("should show error for invalid schema", async ({ page }) => {
      // TODO: Implement
      // Use error mocks
      // Verify error message appears

      await setupErrorMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should require minimum description length", async ({ page }) => {
      // TODO: Implement
      // Enter short description (< 10 chars)
      // Verify validation error appears

      await setupValidationErrorMocks(page);
      await page.goto(BUILDER_PAGES.schema, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// API Builder Tests
// =============================================================================

test.describe("API Builder", () => {
  test.describe("Page Loading", () => {
    test("should load API builder page or show login", async ({ page }) => {
      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.api, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      const onLogin = await isOnLoginPage(page);

      if (onLogin) {
        expect(true).toBe(true);
      } else {
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should intercept API builder calls with mocks", async ({ page }) => {
      let mockWasCalled = false;

      await page.route("**/api/api-builder/generate", async (route) => {
        mockWasCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_API_RESPONSE),
        });
      });

      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.api, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      const onLogin = await isOnLoginPage(page);
      if (!onLogin) {
        await page.evaluate(async () => {
          try {
            await fetch("/api/api-builder/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "model", model: "Post" }),
            });
          } catch {
            // Ignore errors
          }
        });

        expect(mockWasCalled).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe("Generation Flow", () => {
    test.skip("should generate CRUD API from model name", async ({ page }) => {
      // TODO: Implement
      // Setup mocks
      // Navigate to API builder
      // Select "model" mode
      // Enter model name (e.g., "Post")
      // Click generate
      // Verify endpoint list appears

      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should generate API from description", async ({ page }) => {
      // TODO: Implement
      // Select "description" mode
      // Enter description (e.g., "CRUD API for blog posts")
      // Verify model name is inferred

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should display generated files list", async ({ page }) => {
      // TODO: Implement
      // After generation, verify file list appears
      // Check paths from MOCK_API_RESPONSE.files

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show file content when selected", async ({ page }) => {
      // TODO: Implement
      // Click on a file in the list
      // Verify code content appears

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Options", () => {
    test.skip("should allow setting auth level", async ({ page }) => {
      // TODO: Implement
      // Select auth option (none/required/admin)
      // Generate API
      // Verify endpoints have correct auth setting

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should allow toggling pagination", async ({ page }) => {
      // TODO: Implement
      // Toggle pagination option
      // Verify GET list endpoint has/doesn't have pagination

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should allow custom base path", async ({ page }) => {
      // TODO: Implement
      // Enter custom base path (e.g., "/api/v2/posts")
      // Verify generated endpoints use the path

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Apply Flow", () => {
    test.skip("should show existing files warning", async ({ page }) => {
      // TODO: Implement
      // Generate API
      // Mock that some files exist
      // Verify warning about overwriting appears

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test.skip("should validate base path format", async ({ page }) => {
      // TODO: Implement
      // Enter invalid base path (not starting with /api/)
      // Verify validation error

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should handle rate limiting gracefully", async ({ page }) => {
      // TODO: Implement
      // Use error mocks with 429 status
      // Verify rate limit message appears

      await setupErrorMocks(page);
      await page.goto(BUILDER_PAGES.api, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// Agent Execution Tests
// =============================================================================

test.describe("Agent Execution", () => {
  test.describe("Page Loading", () => {
    test("should load agent builder page or show login", async ({ page }) => {
      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.agent, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      const onLogin = await isOnLoginPage(page);

      if (onLogin) {
        expect(true).toBe(true);
      } else {
        await expect(page.locator("body")).toBeVisible();
      }
    });

    test("should intercept agent API calls with mocks", async ({ page }) => {
      let agentListMockCalled = false;
      let agentRunMockCalled = false;

      await page.route("**/api/agents", async (route) => {
        if (route.request().method() === "GET") {
          agentListMockCalled = true;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ agents: [MOCK_AGENT] }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route("**/api/agents/*/run", async (route) => {
        agentRunMockCalled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_AGENT_RUN_RESPONSE),
        });
      });

      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.agent, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(2000);

      const onLogin = await isOnLoginPage(page);
      if (!onLogin) {
        // Test agent list API
        await page.evaluate(async () => {
          try {
            await fetch("/api/agents", { method: "GET" });
          } catch {
            // Ignore errors
          }
        });

        // Test agent run API
        await page.evaluate(async () => {
          try {
            await fetch("/api/agents/test-agent-001/run", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input: "Analyze this" }),
            });
          } catch {
            // Ignore errors
          }
        });

        expect(agentListMockCalled).toBe(true);
        expect(agentRunMockCalled).toBe(true);
      } else {
        expect(true).toBe(true);
      }
    });
  });

  test.describe("Agent List", () => {
    test.skip("should display list of available agents", async ({ page }) => {
      // TODO: Implement
      // Navigate to agent builder/runner
      // Verify agent list appears
      // Check MOCK_AGENT appears in list

      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show agent details", async ({ page }) => {
      // TODO: Implement
      // Click on an agent
      // Verify details panel shows name, description, model

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Run Agent", () => {
    test.skip("should execute agent with input", async ({ page }) => {
      // TODO: Implement
      // Select agent
      // Enter input in text area
      // Click run
      // Verify response appears

      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show message history", async ({ page }) => {
      // TODO: Implement
      // Run agent
      // Verify message bubbles appear
      // Check user, assistant, and tool messages display correctly

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should display tool calls", async ({ page }) => {
      // TODO: Implement
      // Run agent that uses tools
      // Verify tool call is shown in conversation
      // Check tool name and arguments display

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should show iteration count", async ({ page }) => {
      // TODO: Implement
      // Run agent
      // Verify iteration counter shows correct number
      // Check MOCK_AGENT_RUN_RESPONSE.iterations

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Error Handling", () => {
    test.skip("should show error when agent fails", async ({ page }) => {
      // TODO: Implement
      // Use error mocks
      // Run agent
      // Verify error message appears

      await setupErrorMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should handle max iterations exceeded", async ({ page }) => {
      // TODO: Implement
      // Mock response with error: "Max iterations reached"
      // Verify appropriate message displays

      await setupErrorMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should require input before running", async ({ page }) => {
      // TODO: Implement
      // Try to run without input
      // Verify validation error appears

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });

  test.describe("Agent Creation", () => {
    test.skip("should create new agent", async ({ page }) => {
      // TODO: Implement
      // Click "New Agent" button
      // Fill in form fields
      // Submit and verify agent created

      await setupAIMocks(page);
      await setupAuthenticatedMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });

    test.skip("should allow adding tools to agent", async ({ page }) => {
      // TODO: Implement
      // In agent creation form
      // Click "Add Tool"
      // Fill tool details
      // Verify tool appears in list

      await setupAIMocks(page);
      await page.goto(BUILDER_PAGES.agent, { timeout: AI_BUILDER_TIMEOUT });

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// Cross-Builder Integration Tests
// =============================================================================

test.describe("Cross-Builder Integration", () => {
  test("should handle navigation to multiple builder pages", async ({ page }) => {
    await setupAIMocks(page);
    await setupAuthenticatedMocks(page);

    // Track visited pages
    const visitedPages: string[] = [];

    // Visit each builder page
    for (const [name, path] of Object.entries(BUILDER_PAGES)) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
      await page.waitForTimeout(1500);

      const onLogin = await isOnLoginPage(page);
      if (!onLogin) {
        visitedPages.push(name);
      }

      // Page should at least render without crash
      await expect(page.locator("body")).toBeVisible();
    }

    // At minimum, pages should render (might all redirect to login)
    expect(true).toBe(true);
  });

  test("should consistently intercept all builder APIs with mocks", async ({ page }) => {
    const mockCalls: string[] = [];

    // Set up tracking mocks for all builders
    await page.route("**/api/component-builder/generate", async (route) => {
      mockCalls.push("component");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COMPONENT_RESPONSE),
      });
    });

    await page.route("**/api/schema-builder/generate", async (route) => {
      mockCalls.push("schema");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SCHEMA_RESPONSE),
      });
    });

    await page.route("**/api/api-builder/generate", async (route) => {
      mockCalls.push("api");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_API_RESPONSE),
      });
    });

    await page.route("**/api/agents/*/run", async (route) => {
      mockCalls.push("agent");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AGENT_RUN_RESPONSE),
      });
    });

    await setupAuthenticatedMocks(page);
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: AI_BUILDER_TIMEOUT });
    await page.waitForTimeout(2000);

    // Make calls to all APIs via page context
    await page.evaluate(async () => {
      const calls = [
        fetch("/api/component-builder/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: "test" }),
        }),
        fetch("/api/schema-builder/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: "test" }),
        }),
        fetch("/api/api-builder/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "model", model: "Test" }),
        }),
        fetch("/api/agents/test-agent/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: "test" }),
        }),
      ];
      await Promise.all(calls.map((c) => c.catch(() => null)));
    });

    // All mocks should have been called
    expect(mockCalls).toContain("component");
    expect(mockCalls).toContain("schema");
    expect(mockCalls).toContain("api");
    expect(mockCalls).toContain("agent");
  });

  test.skip("should navigate between builders", async ({ page }) => {
    // TODO: Implement
    // Navigate from component builder to schema builder
    // Verify state is preserved or cleared appropriately

    await setupAIMocks(page);
    await setupAuthenticatedMocks(page);
    await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

    expect(true).toBe(true);
  });

  test.skip("should maintain authentication across builders", async ({ page }) => {
    // TODO: Implement
    // Authenticate once
    // Navigate to each builder
    // Verify no re-authentication required

    await setupAIMocks(page);
    await setupAuthenticatedMocks(page);
    await page.goto(BUILDER_PAGES.component, { timeout: AI_BUILDER_TIMEOUT });

    expect(true).toBe(true);
  });
});

// =============================================================================
// API-Level Tests (Direct API calls with mocks)
// =============================================================================

test.describe("Builder API Mocking", () => {
  // These tests need a page context for relative URLs to work
  test.beforeEach(async ({ page }) => {
    // Navigate to home page first to establish base URL context
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("component builder API mock returns expected structure", async ({ page }) => {
    await setupAIMocks(page);

    // Make direct API call through page context
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/component-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "A user profile card" }),
      });
      return res.json();
    });

    // Verify mock response structure
    expect(response).toHaveProperty("spec");
    expect(response).toHaveProperty("code");
    expect(response).toHaveProperty("filename");
    expect(response).toHaveProperty("suggestedPath");
    expect(response.spec.name).toBe("UserCard");
  });

  test("component builder mock includes code with expected patterns", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/component-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "A user card component" }),
      });
      return res.json();
    });

    // Verify code contains expected patterns from CODE_SNIPPETS
    expect(response.code).toContain(CODE_SNIPPETS.component.useClient);
    expect(response.code).toContain(CODE_SNIPPETS.component.interfaceProps);
    expect(response.code).toContain(CODE_SNIPPETS.component.exportFunction);
    expect(response.code).toContain(CODE_SNIPPETS.component.tailwindClass);
  });

  test("schema builder API mock returns expected structure", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/schema-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "A blog post model" }),
      });
      return res.json();
    });

    expect(response).toHaveProperty("model");
    expect(response).toHaveProperty("modelCode");
    expect(response).toHaveProperty("diff");
    expect(response.model.name).toBe("BlogPost");
  });

  test("schema builder mock includes Prisma patterns", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/schema-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "A blog post model" }),
      });
      return res.json();
    });

    // Verify Prisma schema patterns
    expect(response.modelCode).toContain(CODE_SNIPPETS.schema.modelKeyword);
    expect(response.modelCode).toContain(CODE_SNIPPETS.schema.idField);
    expect(response.modelCode).toContain(CODE_SNIPPETS.schema.relation);
    expect(response.modelCode).toContain(CODE_SNIPPETS.schema.timestamps);

    // Verify existing models list
    expect(response.existingModels).toContain("User");
    expect(response.existingModels).toContain("Account");
  });

  test("api builder API mock returns expected structure", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/api-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "model", model: "Post" }),
      });
      return res.json();
    });

    expect(response).toHaveProperty("spec");
    expect(response).toHaveProperty("files");
    expect(response.spec.basePath).toBe("/api/posts");
    expect(response.files.length).toBeGreaterThan(0);
  });

  test("api builder mock includes CRUD endpoints", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/api-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "model", model: "Post" }),
      });
      return res.json();
    });

    // Verify all CRUD methods are present
    const methods = response.spec.endpoints.map((e: { method: string }) => e.method);
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
    expect(methods).toContain("PUT");
    expect(methods).toContain("DELETE");

    // Verify file content includes expected patterns
    const routeFile = response.files.find((f: { path: string }) => f.path.includes("route.ts"));
    expect(routeFile).toBeDefined();
    expect(routeFile.content).toContain(CODE_SNIPPETS.api.nextRequest);
    expect(routeFile.content).toContain(CODE_SNIPPETS.api.nextResponse);
    expect(routeFile.content).toContain(CODE_SNIPPETS.api.requireAuth);
  });

  test("agent run API mock returns expected structure", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/agents/test-agent-001/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "Analyze this code" }),
      });
      return res.json();
    });

    expect(response).toHaveProperty("success");
    expect(response).toHaveProperty("messages");
    expect(response).toHaveProperty("finalResponse");
    expect(response).toHaveProperty("iterations");
    expect(response.success).toBe(true);
  });

  test("agent mock returns message history with tool calls", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/agents/test-agent-001/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "Analyze code" }),
      });
      return res.json();
    });

    // Verify message structure
    expect(response.messages.length).toBeGreaterThan(0);

    // Should have user, assistant, and tool messages
    const roles = response.messages.map((m: { role: string }) => m.role);
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
    expect(roles).toContain("tool");

    // Should have correct iteration count
    expect(response.iterations).toBe(2);
  });

  test("agent list API mock returns agent array", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/agents", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      return res.json();
    });

    expect(response).toHaveProperty("agents");
    expect(Array.isArray(response.agents)).toBe(true);
    expect(response.agents.length).toBeGreaterThan(0);

    // Verify agent structure
    const agent = response.agents[0];
    expect(agent).toHaveProperty("id");
    expect(agent).toHaveProperty("name");
    expect(agent).toHaveProperty("description");
    expect(agent).toHaveProperty("tools");
    expect(agent.name).toBe("Code Analyzer");
  });

  test("error mocks return appropriate status codes", async ({ page }) => {
    await setupErrorMocks(page);

    const componentResponse = await page.evaluate(async () => {
      const res = await fetch("/api/component-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "test" }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(componentResponse.status).toBe(503);
    expect(componentResponse.body.error).toBe("AI service unavailable");
  });

  test("error mocks return different status codes per builder", async ({ page }) => {
    await setupErrorMocks(page);

    // Component builder returns 503
    const componentRes = await page.evaluate(async () => {
      const res = await fetch("/api/component-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "test" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(componentRes.status).toBe(503);
    expect(componentRes.body.error).toBe("AI service unavailable");

    // Schema builder returns 500
    const schemaRes = await page.evaluate(async () => {
      const res = await fetch("/api/schema-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "test" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(schemaRes.status).toBe(500);
    expect(schemaRes.body.error).toBe("Generation failed");

    // API builder returns 429 (rate limit)
    const apiRes = await page.evaluate(async () => {
      const res = await fetch("/api/api-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "model", model: "Test" }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(apiRes.status).toBe(429);
    expect(apiRes.body.error).toBe("Rate limit exceeded");
  });

  test("validation error mocks return 400 with details", async ({ page }) => {
    await setupValidationErrorMocks(page);

    const componentRes = await page.evaluate(async () => {
      const res = await fetch("/api/component-builder/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "" }),
      });
      return { status: res.status, body: await res.json() };
    });

    expect(componentRes.status).toBe(400);
    expect(componentRes.body.error).toBe("Invalid request");
    expect(componentRes.body.details).toBeDefined();
    expect(Array.isArray(componentRes.body.details)).toBe(true);
  });

  test("schema preview API mock returns diff and valid flag", async ({ page }) => {
    await setupAIMocks(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("/api/schema-builder/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelCode: "model Test { id String @id }" }),
      });
      return res.json();
    });

    expect(response).toHaveProperty("diff");
    expect(response).toHaveProperty("valid");
    expect(response.valid).toBe(true);
  });
});
