/**
 * Tests for Variant Runner module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runVariant } from "../../../../src/lib/guardian/harness/variant-runner";
import type { VariantState } from "../../../../src/lib/guardian/harness/harness-state";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock harness-state
vi.mock("../../../../src/lib/guardian/harness/harness-state", () => ({
  updateVariantStatus: vi.fn(),
}));

// Mock security
vi.mock("../../../../src/lib/guardian/security", () => ({
  validateSafeIdentifier: vi.fn(),
  validatePath: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValidationError";
    }
  },
}));

import { spawn, spawnSync } from "child_process";
import { existsSync, writeFileSync, appendFileSync, mkdirSync, readFileSync } from "fs";
import { updateVariantStatus } from "../../../../src/lib/guardian/harness/harness-state";
import { validateSafeIdentifier, validatePath, ValidationError } from "../../../../src/lib/guardian/security";
import { EventEmitter } from "events";

const mockSpawn = spawn as ReturnType<typeof vi.fn>;
const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockAppendFileSync = appendFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockUpdateVariantStatus = updateVariantStatus as ReturnType<typeof vi.fn>;
const mockValidateSafeIdentifier = validateSafeIdentifier as ReturnType<typeof vi.fn>;
const mockValidatePath = validatePath as ReturnType<typeof vi.fn>;

describe("Variant Runner", () => {
  const rootDir = "/test/root";
  const runId = "harness-test-1234";
  const goal = "Test goal";
  
  const createMockVariant = (): VariantState => ({
    id: "variant-1",
    name: "Test Variant",
    worktreePath: ".worktrees/variant-1",
    branch: "poc/test/variant-1",
    status: "pending",
  });

  const createMockChildProcess = () => {
    const mockChild = new EventEmitter() as any;
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    mockChild.kill = vi.fn();
    mockChild.killed = false;
    return mockChild;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockValidateSafeIdentifier.mockImplementation(() => {});
    mockValidatePath.mockImplementation(() => {});
    mockSpawnSync.mockReturnValue({
      status: 0,
      stdout: "",
      stderr: "",
    } as any);
    mockReadFileSync.mockReturnValue("# POC Summary");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("runVariant", () => {
    it("should validate variant ID", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      // Trigger validation error
      mockValidateSafeIdentifier.mockImplementation(() => {
        throw new ValidationError("Invalid variant ID");
      });

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      const result = await resultPromise;

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Invalid variant ID");
      expect(mockValidateSafeIdentifier).toHaveBeenCalledWith("variant-1", "variant.id");
    });

    it("should validate worktree path", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      mockValidatePath.mockImplementation(() => {
        throw new ValidationError("Invalid worktree path");
      });

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      const result = await resultPromise;

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Invalid worktree path");
      expect(mockValidatePath).toHaveBeenCalledWith(
        ".worktrees/variant-1",
        "variant.worktreePath",
        { allowAbsolute: false }
      );
    });

    it("should create variant directory", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      mockExistsSync.mockReturnValue(false);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      // Simulate process completion
      setTimeout(() => mockChild.emit("close", 0), 50);

      await resultPromise;

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("variants/variant-1"),
        { recursive: true }
      );
    });

    it("should write variant brief with goal", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        prdHash: "prd-hash-123",
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      await resultPromise;

      const briefCalls = mockWriteFileSync.mock.calls.filter((call) =>
        (call[0] as string).includes("goal.md")
      );
      expect(briefCalls.length).toBeGreaterThan(0);
      expect(briefCalls[0][1]).toContain(goal);
      expect(briefCalls[0][1]).toContain("prd-hash-123");
    });

    it("should fail if worktree does not exist", async () => {
      const variant = createMockVariant();
      mockExistsSync.mockImplementation((path) => {
        if ((path as string).includes(".worktrees/variant-1")) {
          return false;
        }
        return true;
      });

      const result = await runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Worktree not found");
    });

    it("should update status to running", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      await resultPromise;

      expect(mockUpdateVariantStatus).toHaveBeenCalledWith(
        rootDir,
        runId,
        "variant-1",
        expect.objectContaining({
          status: "running",
          startedAt: expect.any(String),
        })
      );
    });

    it("should write execution log", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      await resultPromise;

      const logCalls = mockWriteFileSync.mock.calls.filter((call) =>
        (call[0] as string).includes("run.log")
      );
      expect(logCalls.length).toBeGreaterThan(0);
    });

    it("should call onProgress callback", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const onProgress = vi.fn();

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
        onProgress,
      });

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("Test output\n"));
        mockChild.emit("close", 0);
      }, 50);

      await resultPromise;

      expect(onProgress).toHaveBeenCalled();
    });

    it("should capture stdout", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => {
        mockChild.stdout.emit("data", Buffer.from("Build output\n"));
        mockChild.emit("close", 0);
      }, 50);

      await resultPromise;

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("run.log"),
        expect.stringContaining("Build output")
      );
    });

    it("should capture stderr", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => {
        mockChild.stderr.emit("data", Buffer.from("Error output\n"));
        mockChild.emit("close", 0);
      }, 50);

      await resultPromise;

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("run.log"),
        expect.stringContaining("[stderr]")
      );
    });

    it("should timeout if execution exceeds maxMinutes", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 0.001, // 0.06 seconds
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", null), 100);

      const result = await resultPromise;

      expect(result.status).toBe("timeout");
      expect(result.error).toBe("Execution timed out");
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should return completed status on success", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      const result = await resultPromise;

      expect(result.status).toBe("completed");
      expect(result.exitCode).toBe(0);
    });

    it("should return failed status on non-zero exit", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 1), 50);

      const result = await resultPromise;

      expect(result.status).toBe("failed");
      expect(result.exitCode).toBe(1);
    });

    it("should handle spawn error", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => {
        mockChild.emit("error", new Error("Spawn failed"));
      }, 50);

      const result = await resultPromise;

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Spawn failed");
    });

    it("should read POC_SUMMARY.md for summary", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const summaryContent = "# Summary\n\nThis variant does X, Y, Z";
      mockReadFileSync.mockReturnValue(summaryContent);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      const result = await resultPromise;

      expect(result.summary).toBe(summaryContent);
    });

    it("should truncate summary to 2000 chars", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const longSummary = "x".repeat(3000);
      mockReadFileSync.mockReturnValue(longSummary);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      const result = await resultPromise;

      expect(result.summary?.length).toBe(2000);
    });

    it("should handle missing POC_SUMMARY.md", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      mockReadFileSync.mockImplementation(() => {
        throw new Error("File not found");
      });

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      const result = await resultPromise;

      expect(result.summary).toBeUndefined();
    });

    it("should calculate duration", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 100);

      const result = await resultPromise;

      expect(result.duration).toBeGreaterThan(0);
    });

    it("should update variant status on completion", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      await resultPromise;

      const completionCall = mockUpdateVariantStatus.mock.calls.find(
        (call) => call[3].status === "completed"
      );
      expect(completionCall).toBeDefined();
      expect(completionCall?.[3]).toMatchObject({
        status: "completed",
        completedAt: expect.any(String),
        exitCode: 0,
      });
    });

    it("should run build steps with spawnSync", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      mockSpawnSync.mockImplementation((cmd, args) => {
        if (cmd === "npm" && args?.[0] === "install") {
          return { status: 0, stdout: "Installed", stderr: "" } as any;
        }
        if (cmd === "npm" && args?.[1] === "build") {
          return { status: 0, stdout: "Built", stderr: "" } as any;
        }
        if (cmd === "npx" && args?.[0] === "tsc") {
          return { status: 0, stdout: "Type checked", stderr: "" } as any;
        }
        return { status: 0, stdout: "", stderr: "" } as any;
      });

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 200);

      await resultPromise;

      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npm",
        ["install", "--silent"],
        expect.objectContaining({
          cwd: expect.stringContaining("variant-1"),
        })
      );
    });

    it("should set environment variables for worktree", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 30,
        maxIterations: 5,
      });

      setTimeout(() => mockChild.emit("close", 0), 50);

      await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            CCPLATE_WORKTREE: "variant-1",
            CCPLATE_HARNESS_RUN: "harness-test-1234",
          }),
        })
      );
    });

    it("should kill process with SIGKILL if SIGTERM fails", async () => {
      const variant = createMockVariant();
      const mockChild = createMockChildProcess();
      mockSpawn.mockReturnValue(mockChild);

      vi.useFakeTimers();

      const resultPromise = runVariant({
        rootDir,
        runId,
        variant,
        goal,
        maxMinutes: 0.001,
        maxIterations: 5,
      });

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(100);

      // Advance past SIGKILL delay
      await vi.advanceTimersByTimeAsync(6000);

      mockChild.emit("close", null);

      await resultPromise;

      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
      expect(mockChild.kill).toHaveBeenCalledWith("SIGKILL");

      vi.useRealTimers();
    });
  });
});
