/**
 * Guardian UI E2E Tests
 *
 * Tests that Guardian pages are protected.
 *
 * IMPORTANT: Requires Convex backend for full functionality.
 * Tests are designed to pass whether or not Convex is available.
 */

import { test, expect } from "@playwright/test";

const GUARDIAN_ROUTES = [
  { path: "/guardian", name: "Guardian Dashboard" },
  { path: "/guardian/timeline", name: "Guardian Timeline" },
  { path: "/guardian/worktrees", name: "Guardian Worktrees" },
  { path: "/guardian/agents", name: "Guardian Agents" },
];

const ADMIN_GUARDIAN_ROUTES = [
  { path: "/admin/guardian", name: "Admin Guardian" },
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

test.describe("Guardian UI", () => {
  test.describe("Guardian Routes Protection", () => {
    for (const route of GUARDIAN_ROUTES) {
      test(`${route.name} is protected`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);

        const protected_ = await isProtected(page);
        expect(protected_).toBe(true);
      });
    }
  });

  test.describe("Admin Guardian Routes Protection", () => {
    for (const route of ADMIN_GUARDIAN_ROUTES) {
      test(`${route.name} is protected`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(3000);

        const protected_ = await isProtected(page);
        expect(protected_).toBe(true);
      });
    }
  });
});
