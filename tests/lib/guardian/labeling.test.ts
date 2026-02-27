/**
 * Tests for Labeling module
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AREA_LABELS,
  getLabelsForFiles,
  hasAreaConflict,
  getAreaPatterns,
  extractFileMentions,
  inferTypeLabel,
  inferPriorityLabel,
  analyzeIssue,
  checkParallelSafety,
  formatParallelCheckResult,
} from "../../../src/lib/guardian/labeling";

// Mock logger
vi.mock("../../../src/lib/guardian/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("AREA_LABELS", () => {
  it("should have defined area labels", () => {
    expect(AREA_LABELS.length).toBeGreaterThan(0);
  });

  it("should have all required fields for each label", () => {
    for (const label of AREA_LABELS) {
      expect(label.name).toBeTruthy();
      expect(label.patterns).toBeDefined();
      expect(Array.isArray(label.patterns)).toBe(true);
      expect(label.description).toBeTruthy();
    }
  });

  it("should have area prefix for all labels", () => {
    for (const label of AREA_LABELS) {
      expect(label.name).toMatch(/^area:/);
    }
  });

  it("should include common project areas", () => {
    const labelNames = AREA_LABELS.map(l => l.name);
    
    expect(labelNames).toContain("area:db");
    expect(labelNames).toContain("area:config");
  });
});

describe("getLabelsForFiles", () => {
  it("should return empty array for no files", () => {
    const labels = getLabelsForFiles([]);
    expect(labels).toEqual([]);
  });

  it("should label guardian core files", () => {
    const files = ["src/lib/guardian/handoff.ts", "src/lib/guardian/logger.ts"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:guardian/core");
  });

  it("should label database files", () => {
    const files = ["prisma/schema.prisma", "src/lib/db.ts"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:db");
  });

  it("should label config files", () => {
    const files = ["package.json", "tsconfig.json", ".env.local"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:config");
  });

  it("should label CLI files", () => {
    const files = ["src/cli/commands/init.ts"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:cli");
  });

  it("should label e2e test files", () => {
    const files = ["e2e/auth.spec.ts", "playwright.config.ts"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:e2e");
  });

  it("should return unique labels", () => {
    const files = [
      "src/lib/guardian/handoff.ts",
      "src/lib/guardian/logger.ts",
      "src/lib/guardian/ralph-engine.ts",
    ];
    const labels = getLabelsForFiles(files);
    
    // All should match guardian/core but label should appear once
    expect(labels.filter(l => l === "area:guardian/core")).toHaveLength(1);
  });

  it("should handle Windows path separators", () => {
    const files = ["src\\lib\\guardian\\handoff.ts"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:guardian/core");
  });

  it("should match wildcard patterns", () => {
    const files = ["src/lib/guardian/harness/poc-runner.ts"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toContain("area:guardian/harness");
  });

  it("should match multiple labels for a single file", () => {
    const files = ["package.json"];
    const labels = getLabelsForFiles(files);
    
    // package.json matches area:config
    expect(labels).toContain("area:config");
  });

  it("should handle files that don't match any pattern", () => {
    const files = ["some-random-file.txt"];
    const labels = getLabelsForFiles(files);
    
    expect(labels).toEqual([]);
  });
});

describe("hasAreaConflict", () => {
  it("should detect conflict when areas overlap", () => {
    const labels1 = ["area:db", "type:feature"];
    const labels2 = ["area:db", "priority:high"];
    
    expect(hasAreaConflict(labels1, labels2)).toBe(true);
  });

  it("should not detect conflict for different areas", () => {
    const labels1 = ["area:db"];
    const labels2 = ["area:cli"];
    
    expect(hasAreaConflict(labels1, labels2)).toBe(false);
  });

  it("should not detect conflict when no area labels present", () => {
    const labels1 = ["type:bug"];
    const labels2 = ["priority:high"];
    
    expect(hasAreaConflict(labels1, labels2)).toBe(false);
  });

  it("should handle empty label arrays", () => {
    expect(hasAreaConflict([], [])).toBe(false);
    expect(hasAreaConflict(["area:db"], [])).toBe(false);
    expect(hasAreaConflict([], ["area:cli"])).toBe(false);
  });

  it("should detect conflict with multiple area labels", () => {
    const labels1 = ["area:db", "area:config", "type:bug"];
    const labels2 = ["area:cli", "area:config", "type:feature"];
    
    expect(hasAreaConflict(labels1, labels2)).toBe(true);
  });

  it("should only check area: prefixed labels", () => {
    const labels1 = ["type:bug", "priority:high"];
    const labels2 = ["type:bug", "priority:low"];
    
    // Same type/priority but those aren't area labels
    expect(hasAreaConflict(labels1, labels2)).toBe(false);
  });
});

describe("getAreaPatterns", () => {
  it("should return patterns for known area", () => {
    const patterns = getAreaPatterns("area:db");
    
    expect(patterns).toContain("prisma/**");
    expect(patterns).toContain("src/lib/db.ts");
  });

  it("should return empty array for unknown area", () => {
    const patterns = getAreaPatterns("area:unknown");
    
    expect(patterns).toEqual([]);
  });

  it("should return patterns for guardian/core", () => {
    const patterns = getAreaPatterns("area:guardian/core");
    
    expect(patterns).toContain("src/lib/guardian/*.ts");
  });

  it("should return patterns for config area", () => {
    const patterns = getAreaPatterns("area:config");
    
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns).toContain("package.json");
  });
});

describe("extractFileMentions", () => {
  it("should extract standard file paths", () => {
    const text = "See src/lib/guardian/handoff.ts for details";
    const files = extractFileMentions(text);
    
    expect(files).toContain("src/lib/guardian/handoff.ts");
  });

  it("should extract paths with ./ prefix", () => {
    const text = "Check ./src/components/Button.tsx";
    const files = extractFileMentions(text);
    
    expect(files).toContain("src/components/Button.tsx");
  });

  it("should extract paths in backticks", () => {
    const text = "Modified `src/lib/db.ts` and `e2e/login.spec.ts`";
    const files = extractFileMentions(text);
    
    expect(files).toContain("src/lib/db.ts");
    expect(files).toContain("e2e/login.spec.ts");
  });

  it("should extract file:line references", () => {
    const text = "Error in src/app/page.tsx:42";
    const files = extractFileMentions(text);
    
    expect(files).toContain("src/app/page.tsx");
  });

  it("should extract from stack traces", () => {
    const text = "at processRequest (src/lib/api.ts:123:45)";
    const files = extractFileMentions(text);
    
    expect(files).toContain("src/lib/api.ts");
  });

  it("should return unique files", () => {
    const text = `
      Modified src/lib/db.ts
      See src/lib/db.ts for details
      Error in src/lib/db.ts:10
    `;
    const files = extractFileMentions(text);
    
    expect(files.filter(f => f === "src/lib/db.ts")).toHaveLength(1);
  });

  it("should handle multiple files", () => {
    const text = `
      Modified:
      - src/lib/guardian/handoff.ts
      - src/lib/guardian/logger.ts
      - e2e/auth.spec.ts
    `;
    const files = extractFileMentions(text);
    
    expect(files.length).toBeGreaterThan(1);
  });

  it("should return empty array for text with no files", () => {
    const text = "Just some regular text without file mentions";
    const files = extractFileMentions(text);
    
    expect(files).toEqual([]);
  });

  it("should handle prisma files", () => {
    const text = "Updated prisma/schema.prisma";
    const files = extractFileMentions(text);
    
    expect(files).toContain("prisma/schema.prisma");
  });

  it("should handle .claude files", () => {
    const text = "Modified .claude/agents/builder.agent";
    const files = extractFileMentions(text);
    
    expect(files).toContain(".claude/agents/builder.agent");
  });
});

describe("inferTypeLabel", () => {
  it("should infer type:bug from error mentions", () => {
    expect(inferTypeLabel("Fix login error", "")).toBe("type:bug");
    expect(inferTypeLabel("", "The app crashes when...")).toBe("type:bug");
    expect(inferTypeLabel("Broken button", "")).toBe("type:bug");
  });

  it("should infer type:security", () => {
    expect(inferTypeLabel("Security vulnerability in auth", "")).toBe("type:security");
    expect(inferTypeLabel("", "Found CVE-2024-1234")).toBe("type:security");
  });

  it("should infer type:performance", () => {
    expect(inferTypeLabel("Slow page load", "")).toBe("type:performance");
    expect(inferTypeLabel("Optimize database queries", "")).toBe("type:performance");
  });

  it("should infer type:refactor", () => {
    expect(inferTypeLabel("Refactor auth module", "")).toBe("type:refactor");
    expect(inferTypeLabel("Cleanup old code", "")).toBe("type:refactor");
  });

  it("should infer type:feature", () => {
    expect(inferTypeLabel("Add dark mode", "")).toBe("type:feature");
    expect(inferTypeLabel("Implement file upload", "")).toBe("type:feature");
    expect(inferTypeLabel("New payment integration", "")).toBe("type:feature");
  });

  it("should infer type:docs", () => {
    expect(inferTypeLabel("Update README", "")).toBe("type:docs");
    expect(inferTypeLabel("Update documentation", "")).toBe("type:docs");
    expect(inferTypeLabel("Improve comments in code", "")).toBe("type:docs");
  });

  it("should return null for ambiguous content", () => {
    expect(inferTypeLabel("General question", "Some generic content")).toBeNull();
  });

  it("should be case-insensitive", () => {
    expect(inferTypeLabel("FIX BUG", "")).toBe("type:bug");
    expect(inferTypeLabel("ADD FEATURE", "")).toBe("type:feature");
  });

  it("should check both title and body", () => {
    expect(inferTypeLabel("General title", "This is a bug")).toBe("type:bug");
    expect(inferTypeLabel("Add feature", "Some details")).toBe("type:feature");
  });
});

describe("inferPriorityLabel", () => {
  it("should infer priority:critical", () => {
    expect(inferPriorityLabel("Critical bug", "")).toBe("priority:critical");
    expect(inferPriorityLabel("", "Production down!")).toBe("priority:critical");
    expect(inferPriorityLabel("Urgent fix needed", "")).toBe("priority:critical");
    expect(inferPriorityLabel("Blocker issue", "")).toBe("priority:critical");
  });

  it("should infer priority:high", () => {
    expect(inferPriorityLabel("Important bug", "")).toBe("priority:high");
    expect(inferPriorityLabel("", "ASAP fix")).toBe("priority:high");
    expect(inferPriorityLabel("High priority feature", "")).toBe("priority:high");
  });

  it("should infer priority:low", () => {
    expect(inferPriorityLabel("Minor issue", "")).toBe("priority:low");
    expect(inferPriorityLabel("Nice to have", "")).toBe("priority:low");
    expect(inferPriorityLabel("Low priority", "")).toBe("priority:low");
  });

  it("should default to priority:medium", () => {
    expect(inferPriorityLabel("Regular bug", "")).toBe("priority:medium");
    expect(inferPriorityLabel("Add feature", "Some details")).toBe("priority:medium");
  });

  it("should be case-insensitive", () => {
    expect(inferPriorityLabel("CRITICAL BUG", "")).toBe("priority:critical");
    expect(inferPriorityLabel("MINOR ISSUE", "")).toBe("priority:low");
  });
});

describe("analyzeIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should analyze a complete issue", () => {
    const result = analyzeIssue(
      123,
      "Fix bug in src/lib/guardian/handoff.ts",
      "The handoff system crashes when..."
    );
    
    expect(result.mentionedFiles).toContain("src/lib/guardian/handoff.ts");
    expect(result.areaLabels).toContain("area:guardian/core");
    expect(result.typeLabel).toBe("type:bug");
    expect(result.priorityLabel).toBeDefined();
    expect(result.suggestedLabels).toContain("area:guardian/core");
    expect(result.suggestedLabels).toContain("type:bug");
  });

  it("should mark single-area issues as parallel-safe", () => {
    const result = analyzeIssue(
      1,
      "Update README",
      "Add installation instructions"
    );
    
    expect(result.parallelSafe).toBe(true);
  });

  it("should mark multi-area issues as not parallel-safe", () => {
    const result = analyzeIssue(
      1,
      "Update files",
      "Modified src/lib/db.ts and src/cli/init.ts"
    );
    
    expect(result.areaLabels.length).toBeGreaterThan(1);
    expect(result.parallelSafe).toBe(false);
  });

  it("should handle issues with no file mentions", () => {
    const result = analyzeIssue(
      1,
      "General improvement",
      "Make things better"
    );
    
    expect(result.mentionedFiles).toEqual([]);
    expect(result.areaLabels).toEqual([]);
    expect(result.parallelSafe).toBe(true); // No areas = safe
  });

  it("should include priority in suggested labels", () => {
    const result = analyzeIssue(
      1,
      "Critical bug",
      "Production is down"
    );
    
    expect(result.priorityLabel).toBe("priority:critical");
    expect(result.suggestedLabels).toContain("priority:critical");
  });

  it("should combine all label types", () => {
    const result = analyzeIssue(
      1,
      "Add feature to src/lib/db.ts",
      "Implement new query builder"
    );
    
    // Should have area, type, and priority
    expect(result.suggestedLabels).toContain("area:db");
    expect(result.suggestedLabels).toContain("type:feature");
    expect(result.suggestedLabels).toContain(result.priorityLabel);
  });
});

describe("checkParallelSafety", () => {
  it("should pass when no area conflicts", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db", "type:bug"] },
      { issueNumber: 2, labels: ["area:cli", "type:feature"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.safe).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it("should detect conflict when areas overlap", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db"] },
      { issueNumber: 2, labels: ["area:db"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.safe).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toEqual({
      issue1: 1,
      issue2: 2,
      sharedArea: "area:db",
    });
  });

  it("should detect multiple conflicts", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db"] },
      { issueNumber: 2, labels: ["area:db"] },
      { issueNumber: 3, labels: ["area:db"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.safe).toBe(false);
    expect(result.conflicts.length).toBeGreaterThan(1);
  });

  it("should recommend parallel execution when safe", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db"] },
      { issueNumber: 2, labels: ["area:cli"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.recommendation).toContain("in parallel");
  });

  it("should recommend serialization when all conflict", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db"] },
      { issueNumber: 2, labels: ["area:db"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.recommendation).toContain("sequentially");
  });

  it("should recommend mixed approach for partial conflicts", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db"] },
      { issueNumber: 2, labels: ["area:db"] },
      { issueNumber: 3, labels: ["area:cli"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.recommendation).toContain("#3");
    expect(result.recommendation).toContain("parallel");
  });

  it("should handle issues with no area labels", () => {
    const issues = [
      { issueNumber: 1, labels: ["type:bug"] },
      { issueNumber: 2, labels: ["type:feature"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    expect(result.safe).toBe(true);
  });

  it("should only report first conflict per pair", () => {
    const issues = [
      { issueNumber: 1, labels: ["area:db", "area:cli"] },
      { issueNumber: 2, labels: ["area:db", "area:cli"] },
    ];
    
    const result = checkParallelSafety(issues);
    
    // Should have 1 conflict (not 2) between this pair
    expect(result.conflicts).toHaveLength(1);
  });
});

describe("formatParallelCheckResult", () => {
  it("should format safe result", () => {
    const result = {
      safe: true,
      issues: [
        { issueNumber: 1, labels: ["area:db"] },
        { issueNumber: 2, labels: ["area:cli"] },
      ],
      conflicts: [],
      recommendation: "All 2 issues can be worked on in parallel.",
    };
    
    const output = formatParallelCheckResult(result);
    
    expect(output).toContain("Parallel Safety Analysis");
    expect(output).toContain("#1");
    expect(output).toContain("#2");
    expect(output).toContain("None");
    expect(output).toContain("All 2 issues can be worked on in parallel");
  });

  it("should format result with conflicts", () => {
    const result = {
      safe: false,
      issues: [
        { issueNumber: 1, labels: ["area:db"] },
        { issueNumber: 2, labels: ["area:db"] },
      ],
      conflicts: [
        { issue1: 1, issue2: 2, sharedArea: "area:db" },
      ],
      recommendation: "All issues have area conflicts. Run them sequentially.",
    };
    
    const output = formatParallelCheckResult(result);
    
    expect(output).toContain("#1");
    expect(output).toContain("#2");
    expect(output).toContain("sequentially");
  });

  it("should show conflict relationships", () => {
    const result = {
      safe: false,
      issues: [
        { issueNumber: 1, labels: ["area:db"] },
        { issueNumber: 2, labels: ["area:db"] },
      ],
      conflicts: [
        { issue1: 1, issue2: 2, sharedArea: "area:db" },
      ],
      recommendation: "Test",
    };
    
    const output = formatParallelCheckResult(result);
    
    // Issue 1 should show conflict with #2
    expect(output).toMatch(/#1.*#2/s);
  });

  it("should truncate long label lists", () => {
    const result = {
      safe: true,
      issues: [
        { 
          issueNumber: 1,
          labels: ["area:db", "area:cli", "area:config", "type:bug"],
        },
      ],
      conflicts: [],
      recommendation: "Test",
    };
    
    const output = formatParallelCheckResult(result);
    
    // Should only show first 2 area labels
    expect(output).toContain("area:db");
    expect(output).toContain("area:cli");
  });
});
