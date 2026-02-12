/**
 * Tests for GitHub Webhook adapter
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock crypto before importing the module
vi.mock("crypto", () => ({
  default: {
    createHmac: vi.fn(),
    timingSafeEqual: vi.fn(),
  },
  createHmac: vi.fn(),
  timingSafeEqual: vi.fn(),
}));

// Mock error-log
vi.mock("../../../../src/lib/guardian/error-log", () => ({
  logWebhookError: vi.fn(),
  logMalformedInput: vi.fn(),
}));

// Mock @hono/node-server
vi.mock("@hono/node-server", () => ({
  serve: vi.fn(),
}));

import { app } from "../../../../src/lib/guardian/adapters/github-webhook";
import * as crypto from "crypto";
import { logWebhookError, logMalformedInput } from "../../../../src/lib/guardian/error-log";

const mockCreateHmac = crypto.createHmac as ReturnType<typeof vi.fn>;
const mockTimingSafeEqual = crypto.timingSafeEqual as ReturnType<typeof vi.fn>;
const mockLogWebhookError = logWebhookError as ReturnType<typeof vi.fn>;
const mockLogMalformedInput = logMalformedInput as ReturnType<typeof vi.fn>;

describe("GitHub Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_WEBHOOK_SECRET;
    // Suppress console output
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /webhook/github", () => {
    it("should accept valid issue_comment webhook without secret", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        repository: { full_name: "owner/repo" },
        comment: { body: "@guardian investigate this issue" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toEqual({
        status: "queued",
        command: "investigate",
        issue: 123,
        repo: "owner/repo",
      });
    });

    it("should verify signature when secret is configured", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "test-secret";

      const payload = JSON.stringify({
        action: "created",
        issue: { number: 123 },
        comment: { body: "@guardian fix" },
      });

      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue("abcd1234"),
      };

      mockCreateHmac.mockReturnValue(mockHmac as any);
      mockTimingSafeEqual.mockReturnValue(true);

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issue_comment",
          "x-hub-signature-256": "sha256=abcd1234",
        },
        body: payload,
      });

      const res = await app.fetch(req);

      expect(res.status).toBe(200);
      expect(mockCreateHmac).toHaveBeenCalledWith("sha256", "test-secret");
    });

    it("should reject invalid signature", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "test-secret";

      const payload = JSON.stringify({
        action: "created",
        issue: { number: 123 },
        comment: { body: "@guardian fix" },
      });

      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue("valid-signature"),
      };

      mockCreateHmac.mockReturnValue(mockHmac as any);
      mockTimingSafeEqual.mockReturnValue(false);

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issue_comment",
          "x-hub-signature-256": "sha256=invalid-signature",
        },
        body: payload,
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Invalid signature");
      expect(mockLogWebhookError).toHaveBeenCalled();
    });

    it("should handle signature length mismatch", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "test-secret";

      const payload = JSON.stringify({
        action: "created",
        comment: { body: "@guardian test" },
      });

      const mockHmac = {
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue("short"),
      };

      mockCreateHmac.mockReturnValue(mockHmac as any);

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
          "x-hub-signature-256": "sha256=very-long-signature-that-does-not-match",
        },
        body: payload,
      });

      const res = await app.fetch(req);

      expect(res.status).toBe(401);
    });

    it("should parse pull_request_review_comment events", async () => {
      const payload = {
        action: "created",
        pull_request: { number: 456 },
        repository: { full_name: "owner/repo" },
        comment: { body: "@guardian review this PR" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "pull_request_review_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.command).toBe("review");
    });

    it("should ignore events without guardian commands", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        comment: { body: "Just a regular comment" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ignored");
    });

    it("should ignore non-comment events", async () => {
      const payload = {
        action: "opened",
        issue: { number: 123, title: "New issue" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issues",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ignored");
    });

    it("should parse guardian commands case-insensitively", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        comment: { body: "@GUARDIAN INVESTIGATE with args" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(data.command).toBe("investigate");
    });

    it("should extract command arguments", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        comment: { body: "@guardian fix authentication bug in login flow" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);

      expect(res.status).toBe(200);
    });

    it("should handle commands without arguments", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        comment: { body: "@guardian triage" },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(data.command).toBe("triage");
    });

    it("should reject empty payload", async () => {
      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: "",
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Empty payload");
      expect(mockLogMalformedInput).toHaveBeenCalled();
    });

    it("should reject invalid JSON", async () => {
      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: "invalid json{",
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid JSON");
      expect(mockLogMalformedInput).toHaveBeenCalled();
    });

    it("should reject non-object JSON payloads", async () => {
      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify("string payload"),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid payload structure");
    });

    it("should handle signature verification errors", async () => {
      process.env.GITHUB_WEBHOOK_SECRET = "test-secret";

      const payload = JSON.stringify({
        action: "created",
        comment: { body: "@guardian test" },
      });

      mockCreateHmac.mockImplementation(() => {
        throw new Error("Crypto error");
      });

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
          "x-hub-signature-256": "sha256=test",
        },
        body: payload,
      });

      const res = await app.fetch(req);

      expect(res.status).toBe(401);
      expect(mockLogWebhookError).toHaveBeenCalled();
    });

    it("should handle missing comment body", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        comment: {},
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ignored");
    });

    it("should handle null comment body", async () => {
      const payload = {
        action: "created",
        issue: { number: 123 },
        comment: { body: null },
      };

      const req = new Request("http://localhost/webhook/github", {
        method: "POST",
        headers: {
          "x-github-event": "issue_comment",
        },
        body: JSON.stringify(payload),
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ignored");
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const req = new Request("http://localhost/health", {
        method: "GET",
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });
  });
});
