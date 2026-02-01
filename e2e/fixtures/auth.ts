/**
 * Authentication fixtures for Playwright E2E tests
 *
 * Note: With Convex Auth (OAuth only), we cannot programmatically log in users
 * without mocking OAuth providers. These fixtures are kept for future use
 * when OAuth mocking is implemented.
 *
 * For now, tests focus on unauthenticated behavior (redirects, etc.)
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
 * Navigate to login page
 */
export async function goToLogin(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
}

/**
 * Extended test with authentication helpers
 *
 * Note: authenticatedPage and adminPage fixtures require OAuth mocking
 * to be implemented. For now, they are placeholders.
 */
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  // Placeholder - requires OAuth mocking
  authenticatedPage: async ({ page }, applyFixture) => {
    // Without OAuth mocking, we can't authenticate
    // Tests using this fixture should check isAuthenticated() and skip if false
    console.warn("authenticatedPage fixture: OAuth mocking not implemented, using unauthenticated page");
    await applyFixture(page);
  },

  // Placeholder - requires OAuth mocking
  adminPage: async ({ browser }, applyFixture) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    console.warn("adminPage fixture: OAuth mocking not implemented, using unauthenticated page");
    await applyFixture(page);
    await context.close();
  },
});

export { expect };
