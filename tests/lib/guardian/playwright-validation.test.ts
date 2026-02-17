/**
 * Tests for Playwright Validation module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadValidationState,
  saveValidationState,
  loadTaskTestMap,
  saveTaskTestMap,
  registerTaskTests,
  parsePlaywrightJsonReport,
  parsePlaywrightOutput,
  runPlaywrightTests,
  findLatestScreenshot,
  checkTaskCanComplete,
  startFixLoop,
  incrementFixLoopAttempt,
  endFixLoop,
  getFixLoopContext,
  updateValidationFromTestRun,
  formatValidationStatus,
  type PlaywrightRunResult,
  type PlaywrightTestResult,
  type ValidationState,
  type TaskTestMapping,
} from "../../../src/lib/guardian/playwright-validation";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { spawnSync } from "child_process";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockReaddirSync = readdirSync as ReturnType<typeof vi.fn>;
const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;

describe("Playwright Validation", () => {
  const rootDir = "/test/project";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadValidationState", () => {
    it("should load existing validation state", () => {
      const state: ValidationState = {
        blockedTasks: [],
        fixLoopActive: true,
        fixLoopAttempts: 2,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      const result = loadValidationState(rootDir);

      expect(result.fixLoopActive).toBe(true);
      expect(result.fixLoopAttempts).toBe(2);
    });

    it("should return default state when file missing", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadValidationState(rootDir);

      expect(result.blockedTasks).toEqual([]);
      expect(result.fixLoopActive).toBe(false);
      expect(result.fixLoopAttempts).toBe(0);
    });

    it("should return default state on parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json");

      const result = loadValidationState(rootDir);

      expect(result.blockedTasks).toEqual([]);
      expect(result.fixLoopActive).toBe(false);
    });
  });

  describe("saveValidationState", () => {
    it("should save validation state as JSON", () => {
      const state: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
      };

      saveValidationState(rootDir, state);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("playwright-validation.json"),
        expect.stringContaining("blockedTasks"),
      );
    });
  });

  describe("loadTaskTestMap", () => {
    it("should load existing mappings", () => {
      const mappings: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["auth.spec.ts"] },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mappings));

      const result = loadTaskTestMap(rootDir);

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe("task1");
    });

    it("should return empty array when file missing", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadTaskTestMap(rootDir);

      expect(result).toEqual([]);
    });

    it("should return empty array on parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid");

      const result = loadTaskTestMap(rootDir);

      expect(result).toEqual([]);
    });
  });

  describe("saveTaskTestMap", () => {
    it("should save mappings as JSON", () => {
      const mappings: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["*.spec.ts"] },
      ];

      saveTaskTestMap(rootDir, mappings);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("task-test-map.json"),
        expect.stringContaining("task1"),
      );
    });
  });

  describe("registerTaskTests", () => {
    it("should add new task mapping", () => {
      mockExistsSync.mockReturnValue(false);

      registerTaskTests(rootDir, "task1", ["auth.spec.ts"]);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].taskId).toBe("task1");
    });

    it("should update existing task mapping", () => {
      const existing: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["auth.spec.ts"] },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      registerTaskTests(rootDir, "task1", ["api.spec.ts"]);

      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(savedData[0].testPatterns).toContain("auth.spec.ts");
      expect(savedData[0].testPatterns).toContain("api.spec.ts");
    });

    it("should deduplicate test patterns", () => {
      const existing: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["auth.spec.ts"] },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existing));

      registerTaskTests(rootDir, "task1", ["auth.spec.ts", "api.spec.ts"]);

      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      const authCount = savedData[0].testPatterns.filter((p: string) => p === "auth.spec.ts").length;
      expect(authCount).toBe(1);
    });
  });

  describe("parsePlaywrightJsonReport", () => {
    it("should parse valid JSON report", () => {
      const jsonReport = {
        suites: [
          {
            file: "auth.spec.ts",
            specs: [
              {
                title: "should login",
                tests: [
                  {
                    results: [
                      {
                        status: "passed",
                        duration: 1500,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(jsonReport));

      const result = parsePlaywrightJsonReport("/path/to/report.json");

      expect(result).not.toBeNull();
      expect(result!.totalTests).toBe(1);
      expect(result!.passed).toBe(1);
      expect(result!.tests[0].status).toBe("passed");
    });

    it("should return null for missing file", () => {
      mockExistsSync.mockReturnValue(false);

      const result = parsePlaywrightJsonReport("/missing.json");

      expect(result).toBeNull();
    });

    it("should return null for invalid JSON", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json");

      const result = parsePlaywrightJsonReport("/path/to/report.json");

      expect(result).toBeNull();
    });

    it("should count failed tests", () => {
      const jsonReport = {
        suites: [
          {
            file: "test.spec.ts",
            specs: [
              {
                title: "test1",
                tests: [
                  {
                    results: [{ status: "passed", duration: 100 }],
                  },
                ],
              },
              {
                title: "test2",
                tests: [
                  {
                    results: [
                      {
                        status: "failed",
                        duration: 200,
                        error: { message: "Expected true to be false" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(jsonReport));

      const result = parsePlaywrightJsonReport("/path/to/report.json");

      expect(result!.passed).toBe(1);
      expect(result!.failed).toBe(1);
      expect(result!.tests[1].error).toBe("Expected true to be false");
    });

    it("should extract screenshot paths", () => {
      const jsonReport = {
        suites: [
          {
            file: "test.spec.ts",
            specs: [
              {
                title: "test1",
                tests: [
                  {
                    results: [
                      {
                        status: "failed",
                        duration: 100,
                        attachments: [
                          { name: "screenshot", path: "/screenshots/test1.png" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(jsonReport));

      const result = parsePlaywrightJsonReport("/path/to/report.json");

      expect(result!.tests[0].screenshotPath).toBe("/screenshots/test1.png");
    });
  });

  describe("parsePlaywrightOutput", () => {
    it("should parse passed test", () => {
      const output = `  ✓  1 [chromium] › auth.spec.ts:5:3 › Login › should display form (2.1s)`;

      const result = parsePlaywrightOutput(output);

      expect(result.passed).toBe(1);
      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].status).toBe("passed");
      expect(result.tests[0].testFile).toBe("auth.spec.ts");
    });

    it("should parse failed test", () => {
      const output = `  ✘  1 [chromium] › auth.spec.ts:10:3 › Login › should validate (1.5s)`;

      const result = parsePlaywrightOutput(output);

      expect(result.failed).toBe(1);
      expect(result.tests[0].status).toBe("failed");
    });

    it("should parse multiple tests", () => {
      const output = `  ✓  1 [chromium] › auth.spec.ts:5:3 › Test1 (2.0s)
  ✘  2 [chromium] › auth.spec.ts:10:3 › Test2 (1.0s)
  ◯  3 [chromium] › auth.spec.ts:15:3 › Test3 (0.5s)`;

      const result = parsePlaywrightOutput(output);

      expect(result.totalTests).toBe(3);
      expect(result.passed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it("should handle empty output", () => {
      const result = parsePlaywrightOutput("");

      expect(result.totalTests).toBe(0);
      expect(result.passed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe("runPlaywrightTests", () => {
    it("should run tests with default options", () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "  ✓  1 [chromium] › test.spec.ts:5:3 › Test (1s)",
        stderr: "",
      });
      mockExistsSync.mockReturnValue(false);

      const result = runPlaywrightTests(rootDir);

      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        ["playwright", "test"],
        expect.any(Object)
      );
      expect(result.passed).toBe(1);
    });

    it("should run tests with pattern", () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "",
        stderr: "",
      });
      mockExistsSync.mockReturnValue(false);

      runPlaywrightTests(rootDir, { testPattern: "auth.spec.ts" });

      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        expect.arrayContaining(["auth.spec.ts"]),
        expect.any(Object)
      );
    });

    it("should use JSON reporter when specified", () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "",
        stderr: "",
      });
      mockExistsSync.mockReturnValue(false);

      runPlaywrightTests(rootDir, { reporter: "json" });

      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        expect.arrayContaining(["--reporter=json"]),
        expect.any(Object)
      );
    });

    it("should update snapshots when specified", () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "",
        stderr: "",
      });
      mockExistsSync.mockReturnValue(false);

      runPlaywrightTests(rootDir, { updateSnapshots: true });

      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        expect.arrayContaining(["--update-snapshots"]),
        expect.any(Object)
      );
    });
  });

  describe("findLatestScreenshot", () => {
    it("should find screenshot matching test name", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce([
          { name: "test-login-should-work", isDirectory: () => true },
        ] as any)
        .mockReturnValueOnce(["screenshot.png"]);

      const result = findLatestScreenshot(rootDir, "login should work");

      expect(result).toContain("screenshot.png");
    });

    it("should return null when no screenshots found", () => {
      mockExistsSync.mockReturnValue(false);

      const result = findLatestScreenshot(rootDir, "test");

      expect(result).toBeNull();
    });

    it("should return null on error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = findLatestScreenshot(rootDir, "test");

      expect(result).toBeNull();
    });
  });

  describe("checkTaskCanComplete", () => {
    it("should allow completion when no tests mapped", () => {
      mockExistsSync.mockReturnValue(false);

      const result = checkTaskCanComplete(rootDir, "task1");

      expect(result.canComplete).toBe(true);
    });

    it("should block when tests not run", () => {
      const mappings: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["auth.spec.ts"] },
      ];
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(mappings))
        .mockReturnValueOnce(JSON.stringify(validation));

      const result = checkTaskCanComplete(rootDir, "task1");

      expect(result.canComplete).toBe(false);
      expect(result.reason).toContain("No Playwright tests have been run");
    });

    it("should block when tests failing", () => {
      const mappings: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["auth"] },
      ];
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
        lastRun: {
          timestamp: new Date().toISOString(),
          totalTests: 1,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 1000,
          tests: [
            {
              testFile: "auth.spec.ts",
              testName: "should login",
              status: "failed",
              duration: 1000,
            },
          ],
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(mappings))
        .mockReturnValueOnce(JSON.stringify(validation));

      const result = checkTaskCanComplete(rootDir, "task1");

      expect(result.canComplete).toBe(false);
      expect(result.failingTests).toHaveLength(1);
    });

    it("should allow completion when tests passing", () => {
      const mappings: TaskTestMapping[] = [
        { taskId: "task1", testPatterns: ["auth"] },
      ];
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
        lastRun: {
          timestamp: new Date().toISOString(),
          totalTests: 1,
          passed: 1,
          failed: 0,
          skipped: 0,
          duration: 1000,
          tests: [
            {
              testFile: "auth.spec.ts",
              testName: "should login",
              status: "passed",
              duration: 1000,
            },
          ],
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(mappings))
        .mockReturnValueOnce(JSON.stringify(validation));

      const result = checkTaskCanComplete(rootDir, "task1");

      expect(result.canComplete).toBe(true);
    });
  });

  describe("fix loop", () => {
    it("should start fix loop", () => {
      mockExistsSync.mockReturnValue(false);

      const testResult: PlaywrightTestResult = {
        testFile: "auth.spec.ts",
        testName: "should login",
        status: "failed",
        duration: 1000,
        error: "Expected true",
      };

      startFixLoop(rootDir, testResult);

      const savedState = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(savedState.fixLoopActive).toBe(true);
      expect(savedState.fixLoopTarget.testName).toBe("should login");
    });

    it("should increment fix loop attempt", () => {
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: true,
        fixLoopAttempts: 1,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validation));

      const attempts = incrementFixLoopAttempt(rootDir);

      expect(attempts).toBe(2);
    });

    it("should end fix loop", () => {
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: true,
        fixLoopAttempts: 3,
        fixLoopTarget: {
          testFile: "test.ts",
          testName: "test",
          error: "error",
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validation));

      endFixLoop(rootDir);

      const savedState = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      expect(savedState.fixLoopActive).toBe(false);
      expect(savedState.fixLoopTarget).toBeUndefined();
    });

    it("should get fix loop context", () => {
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: true,
        fixLoopAttempts: 2,
        fixLoopTarget: {
          testFile: "auth.spec.ts",
          testName: "should login",
          error: "Test failed",
          screenshotPath: "/screenshots/test.png",
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validation));

      const context = getFixLoopContext(rootDir);

      expect(context).toContain("Fix Loop Active");
      expect(context).toContain("Attempt 3");
      expect(context).toContain("auth.spec.ts");
      expect(context).toContain("should login");
    });

    it("should return null when fix loop inactive", () => {
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validation));

      const context = getFixLoopContext(rootDir);

      expect(context).toBeNull();
    });
  });

  describe("updateValidationFromTestRun", () => {
    it("should update state from test run", () => {
      mockExistsSync.mockReturnValue(false);

      const runResult: PlaywrightRunResult = {
        timestamp: new Date().toISOString(),
        totalTests: 1,
        passed: 1,
        failed: 0,
        skipped: 0,
        duration: 1000,
        tests: [
          {
            testFile: "test.ts",
            testName: "test1",
            status: "passed",
            duration: 1000,
          },
        ],
      };

      const result = updateValidationFromTestRun(rootDir, runResult);

      expect(result.shouldStartFixLoop).toBe(false);
    });

    it("should start fix loop on first failure", () => {
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync
        .mockReturnValueOnce(JSON.stringify(validation))
        .mockReturnValueOnce("[]"); // task test map

      const runResult: PlaywrightRunResult = {
        timestamp: new Date().toISOString(),
        totalTests: 1,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 1000,
        tests: [
          {
            testFile: "test.ts",
            testName: "test1",
            status: "failed",
            duration: 1000,
            error: "Failed",
          },
        ],
      };

      const result = updateValidationFromTestRun(rootDir, runResult);

      expect(result.shouldStartFixLoop).toBe(true);
      expect(result.failedTest).toBeDefined();
    });
  });

  describe("formatValidationStatus", () => {
    it("should format status with no runs", () => {
      mockExistsSync.mockReturnValue(false);

      const status = formatValidationStatus(rootDir);

      expect(status).toContain("No Playwright tests");
    });

    it("should format passing status", () => {
      const validation: ValidationState = {
        blockedTasks: [],
        fixLoopActive: false,
        fixLoopAttempts: 0,
        lastRun: {
          timestamp: new Date().toISOString(),
          totalTests: 5,
          passed: 5,
          failed: 0,
          skipped: 0,
          duration: 2000,
          tests: [],
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validation));

      const status = formatValidationStatus(rootDir);

      expect(status).toContain("5/5 passed");
      expect(status).not.toContain("failed");
    });

    it("should format status with failures", () => {
      const validation: ValidationState = {
        blockedTasks: [
          {
            taskId: "task1",
            requiredTests: ["test"],
            failingTests: ["test:fail"],
          },
        ],
        fixLoopActive: true,
        fixLoopAttempts: 2,
        lastRun: {
          timestamp: new Date().toISOString(),
          totalTests: 5,
          passed: 3,
          failed: 2,
          skipped: 0,
          duration: 2000,
          tests: [],
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validation));

      const status = formatValidationStatus(rootDir);

      expect(status).toContain("3/5 passed");
      expect(status).toContain("2 failed");
      expect(status).toContain("1 task(s) blocked");
      expect(status).toContain("Fix loop active");
      expect(status).toContain("attempt 3");
    });
  });
});
