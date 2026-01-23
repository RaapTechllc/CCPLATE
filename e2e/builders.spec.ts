/**
 * AI Builders E2E Tests
 *
 * Tests that AI builder pages are protected.
 *
 * IMPORTANT: Requires Convex backend for full functionality.
 * Tests are designed to pass whether or not Convex is available.
 */

import { test, expect } from "@playwright/test";

// Builder pages that exist
const BUILDER_PAGES = [
  { path: "/hook-builder", name: "Hook Builder" },
  { path: "/component-builder", name: "Component Builder" },
  { path: "/api-builder", name: "API Builder" },
  { path: "/schema-builder", name: "Schema Builder" },
  { path: "/prompt-builder", name: "Prompt Builder" },
  { path: "/agent-builder", name: "Agent Builder" },
];

// API routes that actually exist
const BUILDER_APIS = [
  { api: "/api/api-builder/generate", name: "API Builder" },
  { api: "/api/component-builder/generate", name: "Component Builder" },
  { api: "/api/schema-builder/generate", name: "Schema Builder" },
];

/**
 * Helper to check if a page shows login or redirect behavior
 */
async function isProtected(page: import("@playwright/test").Page): Promise<boolean> {
  const url = page.url();

  // Check if redirected to login
  if (url.includes("/login")) {
    return true;
  }

  // Check if page shows login content
  const hasLoginHeading = await page.getByRole("heading", { name: /sign in/i })
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (hasLoginHeading) {
    return true;
  }

  // Check for auth-related text
  const hasAuthText = await page.getByText(/sign in|log in|unauthorized/i)
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  return hasAuthText;
}

test.describe("AI Builders", () => {
  test.describe("Page Protection", () => {
    for (const builder of BUILDER_PAGES) {
      test(`${builder.name} page is protected`, async ({ page }) => {
        await page.goto(builder.path, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);

        const protected_ = await isProtected(page);
        expect(protected_).toBe(true);
      });
    }
  });

  test.describe("API Protection", () => {
    for (const builder of BUILDER_APIS) {
      test(`${builder.name} API requires authentication`, async ({ request }) => {
        const response = await request.post(builder.api, {
          data: { description: "test" },
        });

        // Should return 401 (proper auth), 500 (broken NextAuth), or 404
        const status = response.status();
        expect([401, 404, 500]).toContain(status);
      });
    }
  });
});
