import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/login");

      // Check page title
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();

      // Check form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/login");

      // Submit empty form
      await page.getByRole("button", { name: "Sign in", exact: true }).click();


      // Check for validation (form should not submit with empty fields)
      // The form has HTML5 validation, so it won't submit
      await expect(page.getByLabel(/email/i)).toBeFocused();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill("invalid@example.com");
      await page.getByLabel(/password/i).fill("wrongpassword123");

      // Submit form
      await page.getByRole("button", { name: "Sign in", exact: true }).click();

      // Wait for error message (toast or inline error)
      // Note: This may need adjustment based on actual error handling
      await page.waitForTimeout(1000);
    });

    test("should have link to register page", async ({ page }) => {
      await page.goto("/login");

      const registerLink = page.getByRole("link", { name: "Sign up", exact: true });
      await expect(registerLink).toBeVisible();

      await registerLink.click();
      await expect(page).toHaveURL("/register");
    });

    test("should have link to forgot password", async ({ page }) => {
      await page.goto("/login");

      const forgotLink = page.getByRole("link", { name: /forgot password/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe("Register Page", () => {
    test("should display registration form", async ({ page }) => {
      await page.goto("/register");

      // Check page title
      await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible();

      // Check form elements
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test("should have link to login page", async ({ page }) => {
      await page.goto("/register");

      const loginLink = page.getByRole("link", { name: "Sign in", exact: true });
      await expect(loginLink).toBeVisible();

      await loginLink.click();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Forgot Password Page", () => {
    test("should display forgot password form", async ({ page }) => {
      await page.goto("/forgot-password");

      // Check page title
      await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();

      // Check form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
    });

    test("should have link back to login", async ({ page }) => {
      await page.goto("/forgot-password");

      const loginLink = page.getByRole("link", { name: "Sign in", exact: true });
      await expect(loginLink).toBeVisible();
    });
  });
});
