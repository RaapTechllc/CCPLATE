import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  generateHarnessReport,
  saveHarnessReport,
  printVariantComparison,
} from "../../../src/lib/guardian/harness/report";
import type { HarnessRun, VariantState } from "../../../src/lib/guardian/harness/harness-state";

const TEST_DIR = join(process.cwd(), "test-fixtures", "harness-report");

function createTestRun(overrides: Partial<HarnessRun> = {}): HarnessRun {
  return {
    id: "test-run-123",
    goal: "Implement user authentication",
    baseBranch: "main",
    variants: [],
    createdAt: "2024-01-01T10:00:00Z",
    maxMinutes: 30,
    maxIterations: 20,
    ...overrides,
  };
}

function createTestVariant(overrides: Partial<VariantState> = {}): VariantState {
  return {
    id: "var-1",
    name: "variant-1",
    worktreePath: ".worktrees/var-1",
    branch: "poc/test-run/var-1",
    status: "pending",
    ...overrides,
  };
}

describe("Harness Report", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("Generate Harness Report", () => {
    it("should generate report header", () => {
      const run = createTestRun();
      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("# POC Harness Report");
      expect(report).toContain("**Run ID:** test-run-123");
      expect(report).toContain("**Goal:** Implement user authentication");
      expect(report).toContain("**Base Branch:** main");
      expect(report).toContain("**Created:** 2024-01-01T10:00:00Z");
    });

    it("should show in-progress status when not completed", () => {
      const run = createTestRun();
      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("**Status:** In Progress");
    });

    it("should show completed timestamp", () => {
      const run = createTestRun({
        completedAt: "2024-01-01T11:00:00Z",
      });
      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("**Completed:** 2024-01-01T11:00:00Z");
    });

    it("should include PRD hash when present", () => {
      const run = createTestRun({
        prdHash: "abc123def",
      });
      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("**PRD Hash:** abc123def");
    });

    it("should generate variant summary table", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({
            id: "var-1",
            name: "approach-a",
            status: "completed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:05:00Z",
            exitCode: 0,
          }),
          createTestVariant({
            id: "var-2",
            name: "approach-b",
            status: "failed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:03:00Z",
            exitCode: 1,
          }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("## Variant Summary");
      expect(report).toContain("| Variant | Status | Duration | Exit Code |");
      expect(report).toContain("approach-a");
      expect(report).toContain("approach-b");
      expect(report).toContain("✅ completed");
      expect(report).toContain("❌ failed");
    });

    it("should mark selected variant with trophy", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({ id: "var-1", name: "winner", status: "completed" }),
          createTestVariant({ id: "var-2", name: "loser", status: "completed" }),
        ],
        selectedVariant: "var-1",
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("winner 🏆");
      expect(report).not.toContain("loser 🏆");
    });

    it("should format duration correctly", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({
            status: "completed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:03:30Z",
          }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("3m 30s");
    });

    it("should format short duration in seconds", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({
            status: "completed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:00:45Z",
          }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("45s");
    });

    it("should show hyphen for missing exit code", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({ status: "timeout" }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      const lines = report.split("\n");
      const summaryLine = lines.find(l => l.includes("variant-1"));
      expect(summaryLine).toContain("| -");
    });

    it("should generate detailed sections for each variant", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({
            name: "variant-a",
            status: "completed",
            error: "Some error",
            logPath: "memory/harness/variants/var-1/run.log",
            summary: "This approach worked well",
          }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("## variant-a");
      expect(report).toContain("**ID:** var-1");
      expect(report).toContain("**Worktree:** .worktrees/var-1");
      expect(report).toContain("**Branch:** poc/test-run/var-1");
      expect(report).toContain("**Status:** ✅ completed");
      expect(report).toContain("**Error:** Some error");
      expect(report).toContain("**Log:**");
      expect(report).toContain("### POC Summary");
      expect(report).toContain("This approach worked well");
    });

    it("should use correct status emoji", () => {
      const statuses: Array<VariantState["status"]> = [
        "completed",
        "failed",
        "timeout",
        "running",
        "pending",
      ];

      statuses.forEach((status, i) => {
        const run = createTestRun({
          variants: [
            createTestVariant({
              id: `var-${i}`,
              name: `variant-${i}`,
              status,
            }),
          ],
        });

        const report = generateHarnessReport(TEST_DIR, run);

        if (status === "completed") expect(report).toContain("✅");
        if (status === "failed") expect(report).toContain("❌");
        if (status === "timeout") expect(report).toContain("⏱️");
        if (status === "running") expect(report).toContain("🔄");
        if (status === "pending") expect(report).toContain("⏳");
      });
    });

    it("should generate recommendations when no variants completed", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({ status: "failed" }),
          createTestVariant({ status: "timeout" }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("## Recommendations");
      expect(report).toContain("No variants completed successfully");
    });

    it("should recommend single completed variant", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({ id: "var-1", name: "winner", status: "completed" }),
          createTestVariant({ status: "failed" }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("Only **winner** completed successfully");
      expect(report).toContain("ccplate harness pick var-1");
    });

    it("should list all selection commands for multiple completions", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({ id: "var-1", name: "approach-a", status: "completed" }),
          createTestVariant({ id: "var-2", name: "approach-b", status: "completed" }),
          createTestVariant({ id: "var-3", name: "approach-c", status: "completed" }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("3 variants completed");
      expect(report).toContain("ccplate harness pick var-1");
      expect(report).toContain("ccplate harness pick var-2");
      expect(report).toContain("ccplate harness pick var-3");
    });

    it("should list failed variants", () => {
      const run = createTestRun({
        variants: [
          createTestVariant({ name: "good", status: "completed" }),
          createTestVariant({
            name: "bad-1",
            status: "failed",
            error: "Build error",
          }),
          createTestVariant({
            name: "bad-2",
            status: "timeout",
          }),
        ],
      });

      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("### Failed Variants (2)");
      expect(report).toContain("**bad-1**: Build error");
      expect(report).toContain("**bad-2**: timeout");
    });

    it("should include generation timestamp", () => {
      const run = createTestRun();
      const report = generateHarnessReport(TEST_DIR, run);

      expect(report).toContain("*Generated by CCPLATE Harness on");
    });
  });

  describe("Save Harness Report", () => {
    it("should create harness directory if missing", () => {
      const run = createTestRun();
      
      saveHarnessReport(TEST_DIR, run);

      expect(existsSync(join(TEST_DIR, "memory", "harness"))).toBe(true);
    });

    it("should save report to report.md", () => {
      const run = createTestRun();
      
      const reportPath = saveHarnessReport(TEST_DIR, run);

      expect(reportPath).toBe(join(TEST_DIR, "memory", "harness", "report.md"));
      expect(existsSync(reportPath)).toBe(true);
    });

    it("should save run-specific report", () => {
      const run = createTestRun({ id: "run-xyz" });
      
      saveHarnessReport(TEST_DIR, run);

      const runReportPath = join(TEST_DIR, "memory", "harness", "report-run-xyz.md");
      expect(existsSync(runReportPath)).toBe(true);
    });

    it("should write correct content", () => {
      const run = createTestRun({
        goal: "Test authentication flow",
      });
      
      const reportPath = saveHarnessReport(TEST_DIR, run);
      const content = readFileSync(reportPath, "utf-8");

      expect(content).toContain("# POC Harness Report");
      expect(content).toContain("Test authentication flow");
    });
  });

  describe("Print Variant Comparison", () => {
    it("should print comparison table to console", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const run = createTestRun({
        variants: [
          createTestVariant({
            name: "approach-a",
            status: "completed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:05:00Z",
            exitCode: 0,
          }),
          createTestVariant({
            id: "var-2",
            name: "approach-b",
            status: "failed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:03:00Z",
            exitCode: 1,
          }),
        ],
      });

      printVariantComparison(run);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("POC Harness Results")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("approach-a")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("approach-b")
      );

      consoleSpy.mockRestore();
    });

    it("should show selected variant with trophy", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const run = createTestRun({
        variants: [
          createTestVariant({ id: "var-1", name: "winner", status: "completed" }),
        ],
        selectedVariant: "var-1",
      });

      printVariantComparison(run);

      const output = consoleSpy.mock.calls.map(c => c.join(" ")).join("\n");
      expect(output).toContain("winner 🏆");

      consoleSpy.mockRestore();
    });

    it("should format durations in comparison", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const run = createTestRun({
        variants: [
          createTestVariant({
            status: "completed",
            startedAt: "2024-01-01T10:00:00Z",
            completedAt: "2024-01-01T10:02:30Z",
          }),
        ],
      });

      printVariantComparison(run);

      const output = consoleSpy.mock.calls.map(c => c.join(" ")).join("\n");
      expect(output).toContain("2m 30s");

      consoleSpy.mockRestore();
    });

    it("should show exit codes", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const run = createTestRun({
        variants: [
          createTestVariant({ exitCode: 0, status: "completed" }),
          createTestVariant({ exitCode: 1, status: "failed" }),
          createTestVariant({ status: "timeout" }),
        ],
      });

      printVariantComparison(run);

      const output = consoleSpy.mock.calls.map(c => c.join(" ")).join("\n");
      expect(output).toMatch(/\|\s*0\s*$/m);
      expect(output).toMatch(/\|\s*1\s*$/m);
      expect(output).toMatch(/\|\s*-\s*$/m);

      consoleSpy.mockRestore();
    });

    it("should print goal", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const run = createTestRun({
        goal: "Implement webhook integration",
        variants: [],
      });

      printVariantComparison(run);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Implement webhook integration")
      );

      consoleSpy.mockRestore();
    });

    it("should handle variants with no timestamps", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const run = createTestRun({
        variants: [
          createTestVariant({ status: "pending" }),
        ],
      });

      printVariantComparison(run);

      const output = consoleSpy.mock.calls.map(c => c.join(" ")).join("\n");
      expect(output).toContain("0s");

      consoleSpy.mockRestore();
    });

    it("should calculate duration for running variant", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      
      const startTime = new Date(Date.now() - 5000);
      const run = createTestRun({
        variants: [
          createTestVariant({
            status: "running",
            startedAt: startTime.toISOString(),
          }),
        ],
      });

      printVariantComparison(run);

      const output = consoleSpy.mock.calls.map(c => c.join(" ")).join("\n");
      expect(output).toMatch(/\d+s/);

      consoleSpy.mockRestore();
    });
  });
});
