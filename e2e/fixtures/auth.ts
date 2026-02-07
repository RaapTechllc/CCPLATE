/**
 * Authentication fixtures for Playwright E2E tests
 *
 * Auth bypass requires BOTH:
 *   1. E2E_TEST_AUTH_BYPASS=true env var on the dev server (playwright.config.ts webServer.env)
 *   2. x-e2e-test-auth: bypass header on each request (set via enableAuthBypass)
 *
 * This two-factor approach lets auth/protected-route tests run normally
 * while builder tests opt-in to bypass via the header.
 */

import { test as base, expect, Page } from "@playwright/test";

// Test user credentials (for future OAuth mocking)
export const TEST_USER = {
  email: "test@example.com",
  name: "Test User",
};

export const TEST_ADMIN = {
  email: "admin@example.com",
  name: "Admin User",
};

/**
 * Check if user is authenticated by looking for auth indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Look for common authenticated state indicators
  const userMenu = page.locator('[data-testid="user-menu"]').or(
    page.getByRole("button", { name: /account|profile|user|sign out/i })
  );

  return await userMenu.isVisible({ timeout: 5000 }).catch(() => false);
}

/**
 * Enable auth bypass for this page's requests.
 * Sets the x-e2e-test-auth header so the middleware treats all
 * requests from this page as authenticated. Call before navigating.
 */
export async function enableAuthBypass(page: Page): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-e2e-test-auth": "bypass" });
}

/**
 * Navigate to login page
 */
export async function goToLogin(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
}

/**
 * Extended test with authentication helpers
 *
 * Auth bypass is handled at the middleware level via E2E_TEST_AUTH_BYPASS.
 * These fixtures provide authenticated page contexts for tests.
 */
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  authenticatedPage: async ({ page }, applyFixture) => {
    await applyFixture(page);
  },

  adminPage: async ({ browser }, applyFixture) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await applyFixture(page);
    await context.close();
  },
});

export { expect };
