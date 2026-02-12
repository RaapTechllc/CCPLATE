/**
 * Tests for Validation Loop module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runPlaywrightTest,
  findTestForTask,
  formatFailureForAgent,
  validateTaskCompletion,
  retryValidation,
  getMaxAttempts,
  type ValidationResult,
  type FixLoopContext,
} from "../../../src/lib/guardian/validation-loop";

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

import { execSync } from "child_process";
import { existsSync } from "fs";

const mockExecSync = execSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;

describe("Validation Loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runPlaywrightTest", () => {
    it("should return passed result when test succeeds", () => {
      mockExecSync.mockReturnValue("All tests passed");

      const result = runPlaywrightTest("test.spec.ts");

      expect(result.passed).toBe(true);
      expect(result.testFile).toBe("test.spec.ts");
      expect(result.failedTests).toEqual([]);
      expect(result.stdout).toBe("All tests passed");
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should return failed result with parsed errors when test fails", () => {
      const playwrightOutput = JSON.stringify({
        suites: [
          {
            specs: [
              {
                title: "should login",
                ok: false,
                tests: [
                  {
                    results: [
                      {
                        error: { message: "Element not found" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      mockExecSync.mockImplementation(() => {
        const error: any = new Error("Test failed");
        error.stdout = playwrightOutput;
        error.stderr = "";
        throw error;
      });

      const result = runPlaywrightTest("auth.spec.ts");

      expect(result.passed).toBe(false);
      expect(result.failedTests).toHaveLength(1);
      expect(result.failedTests[0].name).toBe("should login");
      expect(result.failedTests[0].error).toBe("Element not found");
    });

    it("should handle test failure without JSON output", () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error("Test failed");
        error.stdout = "Some error output with {invalid JSON}";
        error.stderr = "Error details";
        throw error;
      });

      const result = runPlaywrightTest("test.spec.ts");

      expect(result.passed).toBe(false);
      expect(result.stderr).toBe("Error details");
      expect(result.stdout).toContain("Some error output");
      // When JSON parsing fails, fallback entry is added
      expect(result.failedTests).toHaveLength(1);
      expect(result.failedTests[0].name).toBe("test.spec.ts");
      expect(result.failedTests[0].error).toBe("Error details");
    });

    it("should include screenshot if found", () => {
      const playwrightOutput = JSON.stringify({
        suites: [
          {
            specs: [
              {
                title: "Should display page",
                ok: false,
                tests: [
                  {
                    results: [
                      {
                        error: { message: "Failed" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      mockExecSync.mockImplementation(() => {
        const error: any = new Error("Test failed");
        error.stdout = playwrightOutput;
        throw error;
      });

      // findScreenshot checks test-results directory exists, then looks for screenshot files
      mockExistsSync.mockImplementation((path: string) => {
        // Return true for test-results directory check
        if (path.endsWith("test-results")) {
          return true;
        }
        // Return true for the specific screenshot file
        if (path.includes("should-display-page-1.png")) {
          return true;
        }
        return false;
      });

      const result = runPlaywrightTest("test.spec.ts");

      expect(result.failedTests[0].screenshot).toBeTruthy();
      expect(result.failedTests[0].screenshot).toContain("should-display-page-1.png");
    });

    it("should handle malformed JSON output", () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error("Test failed");
        error.stdout = "Some output with {malformed JSON that won't parse}";
        error.stderr = "";
        throw error;
      });

      const result = runPlaywrightTest("test.spec.ts");

      expect(result.passed).toBe(false);
      // When JSON parsing fails, fallback entry is added
      expect(result.failedTests).toHaveLength(1);
      expect(result.failedTests[0].name).toBe("test.spec.ts");
      expect(result.failedTests[0].error).toContain("malformed");
    });

    it("should measure test duration", () => {
      mockExecSync.mockReturnValue("Success");

      const before = Date.now();
      const result = runPlaywrightTest("test.spec.ts");
      const after = Date.now();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeLessThanOrEqual(after - before + 100);
    });
  });

  describe("findTestForTask", () => {
    it("should find test file based on task description keywords", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("auth.spec.ts");
      });

      const result = findTestForTask("Fix login functionality");

      expect(result).toBe("auth.spec.ts");
    });

    it("should find guardian test file", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("guardian.spec.ts");
      });

      const result = findTestForTask("Update dashboard");

      expect(result).toBe("guardian.spec.ts");
    });

    it("should find builders test file", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("builders.spec.ts");
      });

      const result = findTestForTask("Add new hook");

      expect(result).toBe("builders.spec.ts");
    });

    it("should find API test file", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("api.spec.ts");
      });

      const result = findTestForTask("Fix upload API");

      expect(result).toBe("api.spec.ts");
    });

    it("should return null when no matching test found", () => {
      mockExistsSync.mockReturnValue(false);

      const result = findTestForTask("Unknown task");

      expect(result).toBeNull();
    });

    it("should be case insensitive", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("auth.spec.ts");
      });

      const result = findTestForTask("Update LOGIN page");

      expect(result).toBe("auth.spec.ts");
    });

    it("should match multiple keywords", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("auth.spec.ts") || path.includes("guardian.spec.ts");
      });

      // Should match first keyword found
      const result = findTestForTask("Fix authentication on dashboard");

      expect(result).toBe("auth.spec.ts");
    });
  });

  describe("formatFailureForAgent", () => {
    it("should format validation failure with test details", () => {
      const result: ValidationResult = {
        passed: false,
        testFile: "auth.spec.ts",
        duration: 5000,
        failedTests: [
          {
            name: "should login successfully",
            error: "Element '#login-button' not found",
          },
        ],
        stdout: "",
        stderr: "",
      };

      const output = formatFailureForAgent(result);

      expect(output).toContain("❌ Validation Failed");
      expect(output).toContain("auth.spec.ts");
      expect(output).toContain("5000ms");
      expect(output).toContain("should login successfully");
      expect(output).toContain("Element '#login-button' not found");
    });

    it("should include screenshot references", () => {
      const result: ValidationResult = {
        passed: false,
        testFile: "test.spec.ts",
        duration: 1000,
        failedTests: [
          {
            name: "test case",
            error: "Failed",
            screenshot: "/path/to/screenshot.png",
          },
        ],
        stdout: "",
        stderr: "",
      };

      const output = formatFailureForAgent(result);

      expect(output).toContain("📸 Screenshot:");
      expect(output).toContain("/path/to/screenshot.png");
    });

    it("should format multiple failed tests", () => {
      const result: ValidationResult = {
        passed: false,
        testFile: "test.spec.ts",
        duration: 3000,
        failedTests: [
          { name: "test 1", error: "Error 1" },
          { name: "test 2", error: "Error 2" },
        ],
        stdout: "",
        stderr: "",
      };

      const output = formatFailureForAgent(result);

      expect(output).toContain("test 1");
      expect(output).toContain("Error 1");
      expect(output).toContain("test 2");
      expect(output).toContain("Error 2");
    });
  });

  describe("validateTaskCompletion", () => {
    it("should return canComplete when no test file found", () => {
      mockExistsSync.mockReturnValue(false);

      const result = validateTaskCompletion("task-1", "Unknown task");

      expect(result.canComplete).toBe(true);
      expect(result.reason).toContain("No validation test found");
    });

    it("should return canComplete when tests pass", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("auth.spec.ts");
      });
      mockExecSync.mockReturnValue("All tests passed");

      const result = validateTaskCompletion("task-1", "Fix login");

      expect(result.canComplete).toBe(true);
      expect(result.reason).toContain("✅ Validation passed");
      expect(result.reason).toContain("auth.spec.ts");
      expect(result.fixContext).toBeUndefined();
    });

    it("should return fixContext when tests fail", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return path.includes("auth.spec.ts");
      });

      const playwrightOutput = JSON.stringify({
        suites: [
          {
            specs: [
              {
                title: "should login",
                ok: false,
                tests: [
                  {
                    results: [
                      {
                        error: { message: "Login failed" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      mockExecSync.mockImplementation(() => {
        const error: any = new Error("Test failed");
        error.stdout = playwrightOutput;
        throw error;
      });

      const result = validateTaskCompletion("task-1", "Fix login");

      expect(result.canComplete).toBe(false);
      expect(result.reason).toContain("❌ Validation Failed");
      expect(result.fixContext).toBeDefined();
      expect(result.fixContext?.attempt).toBe(1);
      expect(result.fixContext?.maxAttempts).toBe(3);
      expect(result.fixContext?.taskId).toBe("task-1");
      expect(result.fixContext?.testFile).toBe("auth.spec.ts");
      expect(result.fixContext?.lastError).toBe("Login failed");
    });
  });

  describe("retryValidation", () => {
    it("should return canComplete when tests pass on retry", () => {
      mockExecSync.mockReturnValue("All tests passed");

      const context: FixLoopContext = {
        attempt: 1,
        maxAttempts: 3,
        taskId: "task-1",
        testFile: "test.spec.ts",
        lastError: "Previous error",
      };

      const result = retryValidation(context);

      expect(result.canComplete).toBe(true);
      expect(result.reason).toContain("✅ Validation passed on attempt 2");
      expect(result.fixContext).toBeUndefined();
    });

    it("should return updated fixContext when tests still fail", () => {
      const playwrightOutput = JSON.stringify({
        suites: [
          {
            specs: [
              {
                title: "test",
                ok: false,
                tests: [
                  {
                    results: [
                      {
                        error: { message: "New error" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      mockExecSync.mockImplementation(() => {
        const error: any = new Error("Test failed");
        error.stdout = playwrightOutput;
        throw error;
      });

      const context: FixLoopContext = {
        attempt: 1,
        maxAttempts: 3,
        taskId: "task-1",
        testFile: "test.spec.ts",
        lastError: "Previous error",
      };

      const result = retryValidation(context);

      expect(result.canComplete).toBe(false);
      expect(result.fixContext?.attempt).toBe(2);
      expect(result.fixContext?.lastError).toBe("New error");
    });

    it("should fail when max attempts reached", () => {
      const context: FixLoopContext = {
        attempt: 3,
        maxAttempts: 3,
        taskId: "task-1",
        testFile: "test.spec.ts",
        lastError: "Error",
      };

      const result = retryValidation(context);

      expect(result.canComplete).toBe(false);
      expect(result.reason).toContain("Max fix attempts (3) reached");
      expect(result.reason).toContain("Manual intervention required");
      expect(result.fixContext).toBeUndefined();
    });

    it("should not run test when max attempts reached", () => {
      const context: FixLoopContext = {
        attempt: 5,
        maxAttempts: 3,
        taskId: "task-1",
        testFile: "test.spec.ts",
        lastError: "Error",
      };

      retryValidation(context);

      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it("should preserve context values", () => {
      mockExecSync.mockReturnValue("Success");

      const context: FixLoopContext = {
        attempt: 1,
        maxAttempts: 5,
        taskId: "task-123",
        testFile: "custom.spec.ts",
        lastError: "Old error",
        screenshot: "/old/screenshot.png",
      };

      const result = retryValidation(context);

      expect(result.canComplete).toBe(true);
      // maxAttempts and other props should be preserved in the flow
    });
  });

  describe("getMaxAttempts", () => {
    it("should return max attempts constant", () => {
      const result = getMaxAttempts();
      expect(result).toBe(3);
    });
  });
});
