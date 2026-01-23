/**
 * Authentication fixtures for Playwright E2E tests
 * Provides authenticated page contexts for testing protected routes
 */

import { test as base, expect, Page } from "@playwright/test";

// Test user credentials (should match seeded test user)
export const TEST_USER = {
  email: "test@example.com",
  password: "TestPassword123!",
  name: "Test User",
};

export const TEST_ADMIN = {
  email: "admin@example.com", 
  password: "AdminPassword123!",
  name: "Admin User",
};

/**
 * Login helper function
 */
export async function loginAs(
  page: Page, 
  email: string, 
  password: string
): Promise<boolean> {
  await page.goto("/login");
  
  // Wait for form to be ready
  await page.getByLabel(/email/i).waitFor({ state: "visible", timeout: 10000 });
  
  // Fill credentials
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  
  // Submit form
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  
  // Wait for navigation away from login
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  } catch {
    return false;
  }
  
  // Verify we're logged in (not on login page)
  const url = page.url();
  return !url.includes("/login");
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  // Look for user menu or logout button
  const userMenu = page.locator('[data-testid="user-menu"]').or(
    page.getByRole("button", { name: /account|profile|user/i })
  );
  
  if (await userMenu.isVisible()) {
    await userMenu.click();
    await page.getByRole("menuitem", { name: /sign out|logout/i }).click();
  } else {
    // Try direct logout link
    const logoutLink = page.getByRole("link", { name: /sign out|logout/i });
    if (await logoutLink.isVisible()) {
      await logoutLink.click();
    }
  }
  
  // Wait for redirect to login or home or auth error
  await expect(page).toHaveURL(/\/login|\/api\/auth|\/$/);
}

/**
 * Extended test with authenticated contexts
 * 
 * Note: Playwright fixture API uses a callback named 'use' which conflicts
 * with React hooks linting. This is expected Playwright pattern.
 */
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  authenticatedPage: async ({ page }, run) => {
    const success = await loginAs(page, TEST_USER.email, TEST_USER.password);
    if (!success) {
      console.warn("Could not authenticate test user - tests may fail");
    }
    await run(page);
  },
  
  adminPage: async ({ browser }, run) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const success = await loginAs(page, TEST_ADMIN.email, TEST_ADMIN.password);
    if (!success) {
      console.warn("Could not authenticate admin user - tests may fail");
    }
    await run(page);
    await context.close();
  },
});

export { expect };
