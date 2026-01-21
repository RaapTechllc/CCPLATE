import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test.describe("POST /api/auth/register", () => {
    test("should reject registration with invalid email", async ({ request }) => {
      const response = await request.post("/api/auth/register", {
        data: {
          name: "Test User",
          email: "invalid-email",
          password: "Password123",
          confirmPassword: "Password123",
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test("should reject registration with weak password", async ({ request }) => {
      const response = await request.post("/api/auth/register", {
        data: {
          name: "Test User",
          email: "test@example.com",
          password: "weak",
          confirmPassword: "weak",
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test("should reject registration with mismatched passwords", async ({ request }) => {
      const response = await request.post("/api/auth/register", {
        data: {
          name: "Test User",
          email: "test@example.com",
          password: "Password123",
          confirmPassword: "DifferentPassword123",
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });
  });

  test.describe("GET /api/users", () => {
    test("should reject unauthenticated requests", async ({ request }) => {
      const response = await request.get("/api/users");

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  test.describe("GET /api/users/me", () => {
    test("should reject unauthenticated requests", async ({ request }) => {
      const response = await request.get("/api/users/me");

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
    });
  });
});
