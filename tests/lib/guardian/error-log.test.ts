/**
 * Tests for Error Log module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logGuardianError,
  logWebhookError,
  logClaudeHookError,
  logJobError,
  logValidationError,
  logMalformedInput,
  getRecentErrors,
  formatErrors,
  type GuardianError,
} from "../../../src/lib/guardian/error-log";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  appendFileSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, appendFileSync, readFileSync, mkdirSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockAppendFileSync = appendFileSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;

describe("Error Log", () => {
  const rootDir = "/test/project";
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    // Suppress console.error for tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logGuardianError", () => {
    it("should create error log entry with generated ID", () => {
      const result = logGuardianError(rootDir, {
        source: "webhook",
        operation: "process_event",
        error: { message: "Test error" },
        severity: "error",
      });

      expect(result.id).toMatch(/^err-\d+-[a-z0-9]+$/);
      expect(result.timestamp).toBeDefined();
      expect(result.source).toBe("webhook");
      expect(result.operation).toBe("process_event");
    });

    it("should create memory directory if it doesn't exist", () => {
      logGuardianError(rootDir, {
        source: "webhook",
        operation: "test",
        error: { message: "Test" },
        severity: "error",
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should append error to log file", () => {
      logGuardianError(rootDir, {
        source: "webhook",
        operation: "test",
        error: { message: "Test error" },
        severity: "error",
      });

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("guardian-errors.log"),
        expect.stringContaining("Test error")
      );
    });

    it("should include all error details", () => {
      const result = logGuardianError(rootDir, {
        source: "claude_hook",
        operation: "validate",
        error: {
          message: "Validation failed",
          name: "ValidationError",
          stack: "at line 42",
          code: "EVALIDATION",
        },
        context: { file: "test.ts" },
        severity: "warn",
      });

      expect(result.error.message).toBe("Validation failed");
      expect(result.error.name).toBe("ValidationError");
      expect(result.error.stack).toBe("at line 42");
      expect(result.error.code).toBe("EVALIDATION");
      expect(result.context).toEqual({ file: "test.ts" });
    });

    it("should log to console with appropriate icon", () => {
      const consoleSpy = vi.spyOn(console, "error");

      logGuardianError(rootDir, {
        source: "webhook",
        operation: "test",
        error: { message: "Error" },
        severity: "error",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("❌")
      );
    });

    it("should use fatal icon for fatal errors", () => {
      const consoleSpy = vi.spyOn(console, "error");

      logGuardianError(rootDir, {
        source: "webhook",
        operation: "test",
        error: { message: "Fatal" },
        severity: "fatal",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("💀")
      );
    });

    it("should use warning icon for warnings", () => {
      const consoleSpy = vi.spyOn(console, "error");

      logGuardianError(rootDir, {
        source: "webhook",
        operation: "test",
        error: { message: "Warning" },
        severity: "warn",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("⚠️")
      );
    });
  });

  describe("logWebhookError", () => {
    it("should log webhook error from Error object", () => {
      const error = new Error("Webhook failed");
      const result = logWebhookError(rootDir, "process_push", error);

      expect(result.source).toBe("webhook");
      expect(result.operation).toBe("process_push");
      expect(result.error.message).toBe("Webhook failed");
      expect(result.severity).toBe("error");
    });

    it("should handle non-Error objects", () => {
      const result = logWebhookError(rootDir, "test", "String error");

      expect(result.error.message).toBe("String error");
    });

    it("should include error stack", () => {
      const error = new Error("Test");
      const result = logWebhookError(rootDir, "test", error);

      expect(result.error.stack).toBeDefined();
    });

    it("should include context", () => {
      const error = new Error("Test");
      const context = { eventType: "push", repo: "test/repo" };
      const result = logWebhookError(rootDir, "test", error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe("logClaudeHookError", () => {
    it("should log Claude hook error", () => {
      const error = new Error("Hook failed");
      const result = logClaudeHookError(rootDir, "pre-commit", error);

      expect(result.source).toBe("claude_hook");
      expect(result.operation).toBe("pre-commit");
      expect(result.error.message).toBe("Hook failed");
    });

    it("should sanitize input", () => {
      const error = new Error("Test");
      const input = { password: "secret123", data: "normal" };
      const result = logClaudeHookError(rootDir, "test", error, input);

      expect(result.input).toBeDefined();
      expect(result.input).toContain("[REDACTED]");
      expect(result.input).not.toContain("secret123");
    });

    it("should truncate long input", () => {
      const error = new Error("Test");
      const input = "x".repeat(3000);
      const result = logClaudeHookError(rootDir, "test", error, input);

      expect(result.input).toContain("[truncated]");
    });
  });

  describe("logJobError", () => {
    it("should log job error with job ID", () => {
      const error = new Error("Job failed");
      const result = logJobError(rootDir, "job-123", "execute", error);

      expect(result.source).toBe("job_executor");
      expect(result.operation).toBe("job-123:execute");
      expect(result.error.message).toBe("Job failed");
    });

    it("should include context", () => {
      const error = new Error("Test");
      const context = { step: 3, total: 5 };
      const result = logJobError(rootDir, "job-1", "step", error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe("logValidationError", () => {
    it("should log validation error", () => {
      const error = new Error("Validation failed");
      const result = logValidationError(rootDir, "lint", error);

      expect(result.source).toBe("validation");
      expect(result.operation).toBe("lint");
      expect(result.error.message).toBe("Validation failed");
    });

    it("should include context", () => {
      const error = new Error("Test");
      const context = { file: "src/app.ts", rule: "no-console" };
      const result = logValidationError(rootDir, "lint", error, context);

      expect(result.context).toEqual(context);
    });
  });

  describe("logMalformedInput", () => {
    it("should log malformed input as warning", () => {
      const result = logMalformedInput(
        rootDir,
        "webhook",
        "parse_event",
        "Missing required field 'action'",
        { data: "incomplete" }
      );

      expect(result.severity).toBe("warn");
      expect(result.error.message).toContain("Malformed input");
      expect(result.error.name).toBe("MalformedInputError");
    });

    it("should sanitize input", () => {
      const input = { token: "abc123", data: "normal" };
      const result = logMalformedInput(
        rootDir,
        "webhook",
        "test",
        "Invalid format",
        input
      );

      expect(result.input).toContain("[REDACTED]");
      expect(result.input).not.toContain("abc123");
    });
  });

  describe("getRecentErrors", () => {
    it("should return empty array when no log file exists", () => {
      mockExistsSync.mockReturnValue(false);
      const errors = getRecentErrors(rootDir);

      expect(errors).toEqual([]);
    });

    it("should parse errors from log file", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = [
        { id: "err-1", timestamp: "2024-01-01T10:00:00Z", source: "webhook", operation: "test", error: { message: "Error 1" }, severity: "error" },
        { id: "err-2", timestamp: "2024-01-01T11:00:00Z", source: "webhook", operation: "test", error: { message: "Error 2" }, severity: "error" },
      ];
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir);

      expect(errors).toHaveLength(2);
    });

    it("should filter by source", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = [
        { id: "err-1", timestamp: "2024-01-01T10:00:00Z", source: "webhook", operation: "test", error: { message: "Error 1" }, severity: "error" },
        { id: "err-2", timestamp: "2024-01-01T11:00:00Z", source: "claude_hook", operation: "test", error: { message: "Error 2" }, severity: "error" },
      ];
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir, { source: "webhook" });

      expect(errors).toHaveLength(1);
      expect(errors[0].source).toBe("webhook");
    });

    it("should filter by severity", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = [
        { id: "err-1", timestamp: "2024-01-01T10:00:00Z", source: "webhook", operation: "test", error: { message: "Error" }, severity: "error" },
        { id: "err-2", timestamp: "2024-01-01T11:00:00Z", source: "webhook", operation: "test", error: { message: "Warning" }, severity: "warn" },
      ];
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir, { severity: "warn" });

      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe("warn");
    });

    it("should filter by timestamp", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = [
        { id: "err-1", timestamp: "2024-01-01T10:00:00Z", source: "webhook", operation: "test", error: { message: "Old" }, severity: "error" },
        { id: "err-2", timestamp: "2024-01-02T10:00:00Z", source: "webhook", operation: "test", error: { message: "New" }, severity: "error" },
      ];
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir, {
        since: new Date("2024-01-02T00:00:00Z"),
      });

      expect(errors).toHaveLength(1);
      expect(errors[0].error.message).toBe("New");
    });

    it("should sort by timestamp descending", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = [
        { id: "err-1", timestamp: "2024-01-01T10:00:00Z", source: "webhook", operation: "test", error: { message: "Old" }, severity: "error" },
        { id: "err-2", timestamp: "2024-01-02T10:00:00Z", source: "webhook", operation: "test", error: { message: "New" }, severity: "error" },
      ];
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir);

      expect(errors[0].error.message).toBe("New");
      expect(errors[1].error.message).toBe("Old");
    });

    it("should apply limit", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = Array.from({ length: 100 }, (_, i) => ({
        id: `err-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        source: "webhook" as const,
        operation: "test",
        error: { message: `Error ${i}` },
        severity: "error" as const,
      }));
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir, { limit: 10 });

      expect(errors).toHaveLength(10);
    });

    it("should default to 50 limit", () => {
      mockExistsSync.mockReturnValue(true);
      const mockErrors = Array.from({ length: 100 }, (_, i) => ({
        id: `err-${i}`,
        timestamp: new Date().toISOString(),
        source: "webhook" as const,
        operation: "test",
        error: { message: `Error ${i}` },
        severity: "error" as const,
      }));
      mockReadFileSync.mockReturnValue(
        mockErrors.map(e => JSON.stringify(e)).join("\n")
      );

      const errors = getRecentErrors(rootDir);

      expect(errors).toHaveLength(50);
    });

    it("should skip malformed JSON lines", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        'invalid json\n{"id":"err-1","timestamp":"2024-01-01T10:00:00Z","source":"webhook","operation":"test","error":{"message":"Valid"},"severity":"error"}\n'
      );

      const errors = getRecentErrors(rootDir);

      expect(errors).toHaveLength(1);
      expect(errors[0].id).toBe("err-1");
    });

    it("should handle empty lines", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        '\n\n{"id":"err-1","timestamp":"2024-01-01T10:00:00Z","source":"webhook","operation":"test","error":{"message":"Test"},"severity":"error"}\n\n'
      );

      const errors = getRecentErrors(rootDir);

      expect(errors).toHaveLength(1);
    });
  });

  describe("formatErrors", () => {
    it("should return message for empty errors", () => {
      const output = formatErrors([]);

      expect(output).toBe("No errors logged");
    });

    it("should format single error", () => {
      const errors: GuardianError[] = [
        {
          id: "err-1",
          timestamp: "2024-01-01T10:00:00Z",
          source: "webhook",
          operation: "process_event",
          error: { message: "Test error" },
          severity: "error",
        },
      ];

      const output = formatErrors(errors);

      expect(output).toContain("Guardian Errors (1)");
      expect(output).toContain("webhook");
      expect(output).toContain("process_event");
      expect(output).toContain("Test error");
    });

    it("should include context when present", () => {
      const errors: GuardianError[] = [
        {
          id: "err-1",
          timestamp: "2024-01-01T10:00:00Z",
          source: "webhook",
          operation: "test",
          error: { message: "Error" },
          severity: "error",
          context: { file: "test.ts", line: 42 },
        },
      ];

      const output = formatErrors(errors);

      expect(output).toContain("Context:");
      expect(output).toContain("test.ts");
    });

    it("should use appropriate icons", () => {
      const errors: GuardianError[] = [
        {
          id: "err-1",
          timestamp: "2024-01-01T10:00:00Z",
          source: "webhook",
          operation: "test",
          error: { message: "Error" },
          severity: "error",
        },
        {
          id: "err-2",
          timestamp: "2024-01-01T10:00:00Z",
          source: "webhook",
          operation: "test",
          error: { message: "Warning" },
          severity: "warn",
        },
        {
          id: "err-3",
          timestamp: "2024-01-01T10:00:00Z",
          source: "webhook",
          operation: "test",
          error: { message: "Fatal" },
          severity: "fatal",
        },
      ];

      const output = formatErrors(errors);

      expect(output).toContain("❌");
      expect(output).toContain("⚠️");
      expect(output).toContain("💀");
    });

    it("should format multiple errors", () => {
      const errors: GuardianError[] = [
        {
          id: "err-1",
          timestamp: "2024-01-01T10:00:00Z",
          source: "webhook",
          operation: "test1",
          error: { message: "Error 1" },
          severity: "error",
        },
        {
          id: "err-2",
          timestamp: "2024-01-01T11:00:00Z",
          source: "claude_hook",
          operation: "test2",
          error: { message: "Error 2" },
          severity: "error",
        },
      ];

      const output = formatErrors(errors);

      expect(output).toContain("Guardian Errors (2)");
      expect(output).toContain("Error 1");
      expect(output).toContain("Error 2");
    });

    it("should format timestamps as locale string", () => {
      const errors: GuardianError[] = [
        {
          id: "err-1",
          timestamp: "2024-01-15T14:30:00Z",
          source: "webhook",
          operation: "test",
          error: { message: "Test" },
          severity: "error",
        },
      ];

      const output = formatErrors(errors);

      expect(output).toContain("Time:");
      // Date format varies by locale, just check it's present
      expect(output.match(/Time: .+/)).toBeTruthy();
    });
  });

  describe("input sanitization", () => {
    it("should redact passwords", () => {
      const result = logClaudeHookError(
        rootDir,
        "test",
        new Error("Test"),
        { password: "secret123" }
      );

      expect(result.input).toContain("[REDACTED]");
      expect(result.input).not.toContain("secret123");
    });

    it("should redact tokens", () => {
      const result = logClaudeHookError(
        rootDir,
        "test",
        new Error("Test"),
        { token: "abc123xyz" }
      );

      expect(result.input).toContain("[REDACTED]");
      expect(result.input).not.toContain("abc123xyz");
    });

    it("should redact secrets", () => {
      const result = logClaudeHookError(
        rootDir,
        "test",
        new Error("Test"),
        { secret: "shhh" }
      );

      expect(result.input).toContain("[REDACTED]");
      expect(result.input).not.toContain("shhh");
    });

    it("should redact API keys", () => {
      const result = logClaudeHookError(
        rootDir,
        "test",
        new Error("Test"),
        { api_key: "key123" }
      );

      expect(result.input).toContain("[REDACTED]");
      expect(result.input).not.toContain("key123");
    });

    it("should handle undefined input", () => {
      const result = logClaudeHookError(
        rootDir,
        "test",
        new Error("Test"),
        undefined
      );

      expect(result.input).toBeUndefined();
    });

    it("should handle null input", () => {
      const result = logClaudeHookError(
        rootDir,
        "test",
        new Error("Test"),
        null
      );

      expect(result.input).toBeNull();
    });
  });
});
