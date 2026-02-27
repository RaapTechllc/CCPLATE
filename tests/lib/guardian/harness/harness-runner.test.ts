/**
 * Tests for Harness Runner module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startHarnessRun,
  pickVariant,
  cleanupHarness,
  showHarnessStatus,
} from "../../../../src/lib/guardian/harness/harness-runner";

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
}));

// Mock harness-state
vi.mock("../../../../src/lib/guardian/harness/harness-state", () => ({
  loadHarnessState: vi.fn(),
  saveHarnessState: vi.fn(),
  generateRunId: vi.fn(),
  generateVariantId: vi.fn(),
  completeHarnessRun: vi.fn(),
  getHarnessRun: vi.fn(),
  setSelectedVariant: vi.fn(),
  updateVariantStatus: vi.fn(),
}));

// Mock variant-runner
vi.mock("../../../../src/lib/guardian/harness/variant-runner", () => ({
  runVariant: vi.fn(),
}));

// Mock report
vi.mock("../../../../src/lib/guardian/harness/report", () => ({
  saveHarnessReport: vi.fn(),
  printVariantComparison: vi.fn(),
}));

// Mock PRD
vi.mock("../../../../src/lib/guardian/prd", () => ({
  loadPRD: vi.fn(),
}));

// Mock logger
vi.mock("../../../../src/lib/guardian/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import {
  loadHarnessState,
  saveHarnessState,
  generateRunId,
  generateVariantId,
  completeHarnessRun,
  getHarnessRun,
  setSelectedVariant,
} from "../../../../src/lib/guardian/harness/harness-state";
import { runVariant } from "../../../../src/lib/guardian/harness/variant-runner";
import { saveHarnessReport, printVariantComparison } from "../../../../src/lib/guardian/harness/report";
import { loadPRD } from "../../../../src/lib/guardian/prd";

const mockExecSync = execSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockRmSync = rmSync as ReturnType<typeof vi.fn>;
const mockLoadHarnessState = loadHarnessState as ReturnType<typeof vi.fn>;
const mockSaveHarnessState = saveHarnessState as ReturnType<typeof vi.fn>;
const mockGenerateRunId = generateRunId as ReturnType<typeof vi.fn>;
const mockGenerateVariantId = generateVariantId as ReturnType<typeof vi.fn>;
const mockCompleteHarnessRun = completeHarnessRun as ReturnType<typeof vi.fn>;
const mockGetHarnessRun = getHarnessRun as ReturnType<typeof vi.fn>;
const mockSetSelectedVariant = setSelectedVariant as ReturnType<typeof vi.fn>;
const mockRunVariant = runVariant as ReturnType<typeof vi.fn>;
const mockSaveHarnessReport = saveHarnessReport as ReturnType<typeof vi.fn>;
const mockPrintVariantComparison = printVariantComparison as ReturnType<typeof vi.fn>;
const mockLoadPRD = loadPRD as ReturnType<typeof vi.fn>;

describe("Harness Runner", () => {
  const rootDir = "/test/root";
  const goal = "Test goal";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockReturnValue("main");
    mockLoadHarnessState.mockReturnValue({ history: [] });
    mockGenerateRunId.mockReturnValue("harness-test-1234");
    mockGenerateVariantId.mockImplementation((name, i) => `variant-${i + 1}`);
    mockLoadPRD.mockReturnValue(null);
    mockRunVariant.mockResolvedValue({
      variantId: "variant-1",
      status: "completed",
      duration: 1000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("startHarnessRun", () => {
    it("should reject when active run exists", async () => {
      mockLoadHarnessState.mockReturnValue({
        activeRun: {
          id: "harness-existing",
          goal: "Existing",
          baseBranch: "main",
          variants: [],
          createdAt: "2024-01-01T00:00:00Z",
          maxMinutes: 30,
          maxIterations: 5,
        },
        history: [],
      });

      await expect(
        startHarnessRun({
          rootDir,
          goal,
          variants: 2,
        })
      ).rejects.toThrow("Active harness run exists");
    });

    it("should require PRD by default", async () => {
      mockLoadPRD.mockReturnValue(null);

      await expect(
        startHarnessRun({
          rootDir,
          goal,
          variants: 2,
          requirePRD: true,
        })
      ).rejects.toThrow("No PRD found");
    });

    it("should skip PRD check when requirePRD is false", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockRunVariant.mockResolvedValue({
        variantId: "variant-1",
        status: "completed",
        duration: 1000,
      });
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [],
        baseBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      const run = await startHarnessRun({
        rootDir,
        goal,
        variants: 1,
        requirePRD: false,
      });

      expect(run).toBeDefined();
      // PRD loading is optional when requirePRD is false
    });

    it("should create worktrees for all variants", async () => {
      mockLoadPRD.mockReturnValue({
        metadata: { hash: "prd-hash-123" },
      });
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [],
        baseBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      await startHarnessRun({
        rootDir,
        goal,
        variants: 3,
        requirePRD: false,
      });

      // Should call git worktree add for each variant
      const gitCalls = mockExecSync.mock.calls.filter((call) =>
        (call[0] as string).includes("git worktree add")
      );
      expect(gitCalls.length).toBe(3);
    });

    it("should use custom variant names", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [],
        baseBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      const customNames = ["alpha", "beta"];
      mockGenerateVariantId.mockImplementation((name) => name);

      await startHarnessRun({
        rootDir,
        goal,
        variants: 2,
        names: customNames,
        requirePRD: false,
      });

      expect(mockGenerateVariantId).toHaveBeenCalledWith("alpha", 0);
      expect(mockGenerateVariantId).toHaveBeenCalledWith("beta", 1);
    });

    it("should handle worktree creation failure", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockExecSync.mockImplementation((cmd) => {
        if ((cmd as string).includes("git worktree add")) {
          throw new Error("Git worktree failed");
        }
        return "main";
      });

      await expect(
        startHarnessRun({
          rootDir,
          goal,
          variants: 1,
          requirePRD: false,
        })
      ).rejects.toThrow("Failed to create worktree");
    });

    it("should run variants sequentially by default", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [
          { id: "variant-1", name: "variant-1", worktreePath: ".worktrees/variant-1", branch: "poc/test/variant-1", status: "completed" },
          { id: "variant-2", name: "variant-2", worktreePath: ".worktrees/variant-2", branch: "poc/test/variant-2", status: "completed" },
        ],
        baseBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      let callOrder = 0;
      mockRunVariant.mockImplementation(async (opts) => {
        callOrder++;
        return {
          variantId: opts.variant.id,
          status: "completed",
          duration: 1000,
        };
      });

      await startHarnessRun({
        rootDir,
        goal,
        variants: 2,
        requirePRD: false,
        parallel: false,
      });

      expect(mockRunVariant).toHaveBeenCalledTimes(2);
    });

    it("should run variants in parallel when enabled", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [],
        baseBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      await startHarnessRun({
        rootDir,
        goal,
        variants: 3,
        requirePRD: false,
        parallel: true,
        maxConcurrent: 2,
      });

      expect(mockRunVariant).toHaveBeenCalledTimes(3);
    });

    it("should complete run and save report", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [],
        baseBranch: "main",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });
      mockSaveHarnessReport.mockReturnValue("memory/harness/runs/harness-test-1234/report.md");

      await startHarnessRun({
        rootDir,
        goal,
        variants: 1,
        requirePRD: false,
      });

      expect(mockCompleteHarnessRun).toHaveBeenCalledWith(rootDir, "harness-test-1234");
      expect(mockSaveHarnessReport).toHaveBeenCalled();
      expect(mockPrintVariantComparison).toHaveBeenCalled();
    });

    it("should handle dry run", async () => {
      await expect(
        startHarnessRun({
          rootDir,
          goal,
          variants: 2,
          requirePRD: false,
          dryRun: true,
        })
      ).rejects.toThrow("Dry run complete");

      // Should not create worktrees
      const gitCalls = mockExecSync.mock.calls.filter((call) =>
        (call[0] as string).includes("git worktree add")
      );
      expect(gitCalls.length).toBe(0);
    });

    it("should use custom base branch", async () => {
      mockLoadPRD.mockReturnValue(null);
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test-1234",
        goal,
        variants: [],
        baseBranch: "develop",
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      await startHarnessRun({
        rootDir,
        goal,
        variants: 1,
        baseBranch: "develop",
        requirePRD: false,
      });

      const gitCalls = mockExecSync.mock.calls.filter((call) =>
        (call[0] as string).includes("git worktree add") &&
        (call[0] as string).includes("develop")
      );
      expect(gitCalls.length).toBeGreaterThan(0);
    });
  });

  describe("pickVariant", () => {
    const mockRun = {
      id: "harness-test",
      goal: "Test",
      baseBranch: "main",
      variants: [
        {
          id: "variant-1",
          name: "Test Variant",
          worktreePath: ".worktrees/variant-1",
          branch: "poc/test/variant-1",
          status: "completed" as const,
        },
      ],
      createdAt: "2024-01-01T00:00:00Z",
      maxMinutes: 30,
      maxIterations: 5,
    };

    beforeEach(() => {
      mockGetHarnessRun.mockReturnValue(mockRun);
      mockExecSync.mockReturnValue("main");
    });

    it("should throw if run not found", async () => {
      mockGetHarnessRun.mockReturnValue(null);

      await expect(
        pickVariant(rootDir, "variant-1", "harness-missing")
      ).rejects.toThrow("Run not found");
    });

    it("should throw if variant not found", async () => {
      await expect(
        pickVariant(rootDir, "variant-999")
      ).rejects.toThrow("Variant not found");
    });

    it("should warn if variant not completed", async () => {
      const runWithPending = {
        ...mockRun,
        variants: [
          { ...mockRun.variants[0], status: "failed" as const },
        ],
      };
      mockGetHarnessRun.mockReturnValue(runWithPending);

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await pickVariant(rootDir, "variant-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Warning")
      );

      consoleSpy.mockRestore();
    });

    it("should merge variant with merge strategy", async () => {
      await pickVariant(rootDir, "variant-1", undefined, "merge");

      expect(mockSetSelectedVariant).toHaveBeenCalledWith(rootDir, "harness-test", "variant-1");
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining("git merge"),
        expect.any(Object)
      );
    });

    it("should warn about manual rebase", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await pickVariant(rootDir, "variant-1", undefined, "rebase");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Rebase strategy requires manual execution")
      );

      consoleSpy.mockRestore();
    });

    it("should warn about manual cherry-pick", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await pickVariant(rootDir, "variant-1", undefined, "cherry-pick");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Cherry-pick strategy requires manual execution")
      );

      consoleSpy.mockRestore();
    });

    it("should warn if not on base branch", async () => {
      mockExecSync.mockReturnValue("different-branch");

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await pickVariant(rootDir, "variant-1");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Switch to base branch first")
      );

      consoleSpy.mockRestore();
    });

    it("should handle merge conflicts", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if ((cmd as string).includes("git merge")) {
          throw new Error("Merge conflict");
        }
        return "main";
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await pickVariant(rootDir, "variant-1", undefined, "merge");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Merge failed")
      );

      consoleSpy.mockRestore();
    });

    it("should update report after selection", async () => {
      mockGetHarnessRun.mockReturnValue(mockRun);

      await pickVariant(rootDir, "variant-1");

      expect(mockSaveHarnessReport).toHaveBeenCalled();
    });
  });

  describe("cleanupHarness", () => {
    const mockRun = {
      id: "harness-test",
      goal: "Test",
      baseBranch: "main",
      variants: [
        {
          id: "variant-1",
          name: "Variant 1",
          worktreePath: ".worktrees/variant-1",
          branch: "poc/test/variant-1",
          status: "completed" as const,
        },
        {
          id: "variant-2",
          name: "Variant 2",
          worktreePath: ".worktrees/variant-2",
          branch: "poc/test/variant-2",
          status: "completed" as const,
        },
      ],
      createdAt: "2024-01-01T00:00:00Z",
      maxMinutes: 30,
      maxIterations: 5,
    };

    beforeEach(() => {
      mockGetHarnessRun.mockReturnValue(mockRun);
    });

    it("should throw if run not found", async () => {
      mockGetHarnessRun.mockReturnValue(null);

      await expect(
        cleanupHarness(rootDir, "harness-missing")
      ).rejects.toThrow("Run not found");
    });

    it("should remove all worktrees", async () => {
      await cleanupHarness(rootDir);

      const removeCalls = mockExecSync.mock.calls.filter((call) =>
        (call[0] as string).includes("git worktree remove")
      );
      expect(removeCalls.length).toBe(2);
    });

    it("should keep selected variant when requested", async () => {
      const runWithSelected = {
        ...mockRun,
        selectedVariant: "variant-1",
      };
      mockGetHarnessRun.mockReturnValue(runWithSelected);

      await cleanupHarness(rootDir, undefined, true);

      const removeCalls = mockExecSync.mock.calls.filter((call) =>
        (call[0] as string).includes("git worktree remove")
      );
      expect(removeCalls.length).toBe(1);
    });

    it("should handle worktree removal failure gracefully", async () => {
      mockExecSync.mockImplementation((cmd) => {
        if ((cmd as string).includes("git worktree remove")) {
          throw new Error("Removal failed");
        }
        return "";
      });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cleanupHarness(rootDir);

      // Console errors happen but rmSync cleanup handles the fallback
      consoleSpy.mockRestore();
    });

    it("should fallback to rmSync if git command fails", async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Git failed");
      });

      await cleanupHarness(rootDir);

      expect(mockRmSync).toHaveBeenCalled();
    });
  });

  describe("showHarnessStatus", () => {
    it("should show message when no runs exist", () => {
      mockGetHarnessRun.mockReturnValue(null);
      mockLoadHarnessState.mockReturnValue({ history: [] });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      showHarnessStatus(rootDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No harness runs found")
      );

      consoleSpy.mockRestore();
    });

    it("should show recent history when no active run", () => {
      mockGetHarnessRun.mockReturnValue(null);
      mockLoadHarnessState.mockReturnValue({
        history: [
          {
            id: "harness-old",
            goal: "Old run",
            baseBranch: "main",
            variants: [],
            createdAt: "2024-01-01T00:00:00Z",
            completedAt: "2024-01-01T01:00:00Z",
            maxMinutes: 30,
            maxIterations: 5,
          },
        ],
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      showHarnessStatus(rootDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Recent runs")
      );

      consoleSpy.mockRestore();
    });

    it("should show active run details", () => {
      const mockRun = {
        id: "harness-active",
        goal: "Active run",
        baseBranch: "main",
        variants: [
          {
            id: "variant-1",
            name: "Variant 1",
            worktreePath: ".worktrees/variant-1",
            branch: "poc/test/variant-1",
            status: "completed" as const,
          },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };
      mockGetHarnessRun.mockReturnValue(mockRun);

      showHarnessStatus(rootDir);

      expect(mockPrintVariantComparison).toHaveBeenCalledWith(mockRun);
    });

    it("should show available commands", () => {
      mockGetHarnessRun.mockReturnValue({
        id: "harness-test",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      showHarnessStatus(rootDir);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Commands:")
      );

      consoleSpy.mockRestore();
    });
  });
});
