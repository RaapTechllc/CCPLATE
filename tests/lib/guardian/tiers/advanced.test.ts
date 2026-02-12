/**
 * Tests for Advanced Tier module
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ADVANCED_CONFIG,
  ADVANCED_QUESTIONS,
  requiresReview,
  categorizeChange,
  assessImpact,
  formatChangePreview,
  type PendingChange,
  type ChangeCategory,
  type ChangeImpact,
} from "../../../../src/lib/guardian/tiers/advanced";

describe("Advanced Tier Config", () => {
  it("should have correct tier name", () => {
    expect(ADVANCED_CONFIG.tier).toBe("advanced");
    expect(ADVANCED_CONFIG.name).toBe("Advanced");
  });

  it("should have 50% autonomy level", () => {
    expect(ADVANCED_CONFIG.autonomyLevel).toBe(0.5);
  });

  it("should use guided interview style", () => {
    expect(ADVANCED_CONFIG.interviewStyle).toBe("guided");
  });

  it("should show architecture preview", () => {
    expect(ADVANCED_CONFIG.showArchitecturePreview).toBe(true);
  });

  it("should have comprehensive nudge configuration", () => {
    expect(ADVANCED_CONFIG.nudgeConfig.suppressTypes).toEqual([]);
    expect(ADVANCED_CONFIG.nudgeConfig.showTypes.length).toBeGreaterThan(0);
    expect(ADVANCED_CONFIG.nudgeConfig.nudgeFormat).toBe("warning");
  });

  it("should have appropriate context thresholds", () => {
    const thresholds = ADVANCED_CONFIG.nudgeConfig.contextThresholds;
    expect(thresholds.warning).toBe(0.3);
    expect(thresholds.orange).toBe(0.5);
    expect(thresholds.critical).toBe(0.7);
    expect(thresholds.forceHandoff).toBe(0.9);
  });

  it("should require HITL for critical operations", () => {
    const hitl = ADVANCED_CONFIG.hitlConfig;
    expect(hitl.schemaChange).toBe("always");
    expect(hitl.authChange).toBe("always");
    expect(hitl.buildError).toBe("always");
    expect(hitl.testFailure).toBe("always");
    expect(hitl.securityConcern).toBe("always");
  });

  it("should have configurable HITL for file operations", () => {
    const hitl = ADVANCED_CONFIG.hitlConfig;
    expect(hitl.newFile).toBe("configurable");
    expect(hitl.fileModify).toBe("configurable");
  });

  it("should not auto-resolve errors", () => {
    const autoResolve = ADVANCED_CONFIG.autoResolve;
    expect(autoResolve.lintErrors).toBe(false);
    expect(autoResolve.buildErrors).toBe(false);
    expect(autoResolve.testFailures).toBe(false);
    expect(autoResolve.maxRetries).toBe(1);
  });
});

describe("Advanced Questions", () => {
  it("should include all PRD questions", () => {
    const keys = ADVANCED_QUESTIONS.map((q) => q.key);
    
    expect(keys).toContain("projectName");
    expect(keys).toContain("techStack.frontend");
    expect(keys).toContain("techStack.backend");
    expect(keys).toContain("techStack.database");
    expect(keys).toContain("techStack.auth");
    expect(keys).toContain("targetUser");
    expect(keys).toContain("jobsToBeDone");
  });

  it("should include advanced control questions", () => {
    const keys = ADVANCED_QUESTIONS.map((q) => q.key);
    
    expect(keys).toContain("reviewPreferences");
    expect(keys).toContain("commitStyle");
    expect(keys).toContain("testRequirements");
    expect(keys).toContain("changeBatchSize");
  });

  it("should have review preferences as multiselect", () => {
    const reviewQ = ADVANCED_QUESTIONS.find((q) => q.key === "reviewPreferences");
    
    expect(reviewQ).toBeDefined();
    expect(reviewQ?.type).toBe("multiselect");
    expect(reviewQ?.required).toBe(true);
    expect(reviewQ?.minSelect).toBe(1);
  });

  it("should have commit style options", () => {
    const commitQ = ADVANCED_QUESTIONS.find((q) => q.key === "commitStyle");
    
    expect(commitQ).toBeDefined();
    expect(commitQ?.type).toBe("select");
    expect(commitQ?.options?.length).toBe(3);
    expect(commitQ?.default).toBe("feature");
  });

  it("should have test requirements options", () => {
    const testQ = ADVANCED_QUESTIONS.find((q) => q.key === "testRequirements");
    
    expect(testQ).toBeDefined();
    expect(testQ?.type).toBe("select");
    expect(testQ?.options?.length).toBe(4);
    expect(testQ?.default).toBe("alongside");
  });

  it("should have change batch size options", () => {
    const batchQ = ADVANCED_QUESTIONS.find((q) => q.key === "changeBatchSize");
    
    expect(batchQ).toBeDefined();
    expect(batchQ?.type).toBe("select");
    expect(batchQ?.default).toBe("3");
  });

  it("should have appropriate defaults for review preferences", () => {
    const reviewQ = ADVANCED_QUESTIONS.find((q) => q.key === "reviewPreferences");
    
    expect(reviewQ?.default).toEqual(["schema", "auth", "api"]);
  });

  it("should have descriptions for all control questions", () => {
    const controlKeys = ["commitStyle", "testRequirements"];
    
    for (const key of controlKeys) {
      const question = ADVANCED_QUESTIONS.find((q) => q.key === key);
      expect(question?.options).toBeDefined();
      
      for (const option of question?.options || []) {
        if (option.description) {
          expect(option.description.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("should have all required fields marked", () => {
    const requiredKeys = [
      "projectName",
      "techStack.frontend",
      "techStack.backend",
      "reviewPreferences",
    ];

    for (const key of requiredKeys) {
      const question = ADVANCED_QUESTIONS.find((q) => q.key === key);
      expect(question?.required).toBe(true);
    }
  });
});

describe("requiresReview", () => {
  const createChange = (
    type: "create" | "modify" | "delete",
    category: ChangeCategory,
    impact: ChangeImpact = "medium"
  ): PendingChange => ({
    id: "test-change",
    type,
    path: "test/file.ts",
    summary: "Test change",
    impact,
    category,
    timestamp: new Date().toISOString(),
  });

  it("should require review for critical impact", () => {
    const change = createChange("modify", "other", "critical");
    
    expect(requiresReview(change, [])).toBe(true);
  });

  it("should require review for schema changes when in preferences", () => {
    const change = createChange("modify", "schema");
    
    expect(requiresReview(change, ["schema"])).toBe(true);
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should require review for auth changes when in preferences", () => {
    const change = createChange("modify", "auth");
    
    expect(requiresReview(change, ["auth"])).toBe(true);
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should require review for API changes when in preferences", () => {
    const change = createChange("modify", "api");
    
    expect(requiresReview(change, ["api"])).toBe(true);
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should require review for UI changes when in preferences", () => {
    const change = createChange("modify", "ui");
    
    expect(requiresReview(change, ["ui"])).toBe(true);
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should require review for new file creation when in preferences", () => {
    const change = createChange("create", "other");
    
    expect(requiresReview(change, ["new_file"])).toBe(true);
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should require review for any file modification when in preferences", () => {
    const change = createChange("modify", "other");
    
    expect(requiresReview(change, ["file_modify"])).toBe(true);
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should not require review for low impact changes without preferences", () => {
    const change = createChange("modify", "tests", "low");
    
    expect(requiresReview(change, [])).toBe(false);
  });

  it("should handle multiple preferences", () => {
    const schemaChange = createChange("modify", "schema");
    const apiChange = createChange("modify", "api");
    const uiChange = createChange("modify", "ui");
    
    const preferences = ["schema", "api"];
    
    expect(requiresReview(schemaChange, preferences)).toBe(true);
    expect(requiresReview(apiChange, preferences)).toBe(true);
    expect(requiresReview(uiChange, preferences)).toBe(false);
  });
});

describe("categorizeChange", () => {
  it("should categorize schema files", () => {
    expect(categorizeChange("prisma/schema.prisma")).toBe("schema");
    expect(categorizeChange("src/lib/migrations/001.sql")).toBe("schema");
    expect(categorizeChange("schema.sql")).toBe("schema");
  });

  it("should categorize auth files", () => {
    expect(categorizeChange("src/lib/auth.ts")).toBe("auth");
    expect(categorizeChange("src/components/Login.tsx")).toBe("auth");
    expect(categorizeChange("src/middleware/session.ts")).toBe("auth");
    expect(categorizeChange("src/utils/password.ts")).toBe("auth");
  });

  it("should categorize API files", () => {
    expect(categorizeChange("src/app/api/users/route.ts")).toBe("api");
    expect(categorizeChange("src/endpoints/data.ts")).toBe("api");
    expect(categorizeChange("pages/api/posts/route.ts")).toBe("api");
  });

  it("should categorize UI files", () => {
    expect(categorizeChange("src/components/Button.tsx")).toBe("ui");
    expect(categorizeChange("src/ui/Card.jsx")).toBe("ui");
    expect(categorizeChange("pages/index.tsx")).toBe("ui");
  });

  it("should categorize test files", () => {
    expect(categorizeChange("src/lib/utils.test.ts")).toBe("tests");
    expect(categorizeChange("src/lib/utils.spec.ts")).toBe("tests");
    expect(categorizeChange("tests/utils.test.ts")).toBe("tests");
  });

  it("should categorize config files", () => {
    expect(categorizeChange("next.config.js")).toBe("config");
    expect(categorizeChange("tsconfig.json")).toBe("config");
    expect(categorizeChange(".env.local")).toBe("config");
    expect(categorizeChange("webpack.config.js")).toBe("config");
  });

  it("should categorize as other for uncategorized files", () => {
    expect(categorizeChange("src/lib/utils.ts")).toBe("other");
    expect(categorizeChange("README.md")).toBe("other");
  });

  it("should be case-insensitive", () => {
    expect(categorizeChange("PRISMA/SCHEMA.PRISMA")).toBe("schema");
    expect(categorizeChange("SRC/LIB/AUTH.TS")).toBe("auth");
  });
});

describe("assessImpact", () => {
  const createChange = (category: ChangeCategory): PendingChange => ({
    id: "test",
    type: "modify",
    path: "test.ts",
    summary: "Test",
    impact: "medium",
    category,
    timestamp: new Date().toISOString(),
  });

  it("should assess schema changes as critical", () => {
    const change = createChange("schema");
    expect(assessImpact(change)).toBe("critical");
  });

  it("should assess auth changes as critical", () => {
    const change = createChange("auth");
    expect(assessImpact(change)).toBe("critical");
  });

  it("should assess API changes as high", () => {
    const change = createChange("api");
    expect(assessImpact(change)).toBe("high");
  });

  it("should assess UI changes as medium", () => {
    const change = createChange("ui");
    expect(assessImpact(change)).toBe("medium");
  });

  it("should assess test changes as medium", () => {
    const change = createChange("tests");
    expect(assessImpact(change)).toBe("medium");
  });

  it("should assess config changes as low", () => {
    const change = createChange("config");
    expect(assessImpact(change)).toBe("low");
  });

  it("should assess other changes as low", () => {
    const change = createChange("other");
    expect(assessImpact(change)).toBe("low");
  });
});

describe("formatChangePreview", () => {
  const createChange = (
    id: string,
    type: "create" | "modify" | "delete",
    path: string,
    impact: ChangeImpact,
    category: ChangeCategory
  ): PendingChange => ({
    id,
    type,
    path,
    summary: `Summary for ${id}`,
    impact,
    category,
    timestamp: new Date().toISOString(),
  });

  it("should show message for no pending changes", () => {
    const output = formatChangePreview([]);
    expect(output).toContain("No pending changes");
  });

  it("should show change count", () => {
    const changes = [
      createChange("1", "create", "file1.ts", "medium", "other"),
      createChange("2", "modify", "file2.ts", "high", "api"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("(2)");
  });

  it("should show change types", () => {
    const changes = [
      createChange("1", "create", "new.ts", "medium", "other"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("CREATE");
  });

  it("should show file paths", () => {
    const changes = [
      createChange("1", "modify", "src/lib/auth.ts", "critical", "auth"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("src/lib/auth.ts");
  });

  it("should show impact levels with emoji", () => {
    const changes = [
      createChange("1", "modify", "file1.ts", "low", "other"),
      createChange("2", "modify", "file2.ts", "medium", "ui"),
      createChange("3", "modify", "file3.ts", "high", "api"),
      createChange("4", "modify", "file4.ts", "critical", "auth"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("🟢");
    expect(output).toContain("🟡");
    expect(output).toContain("🟠");
    expect(output).toContain("🔴");
  });

  it("should show categories", () => {
    const changes = [
      createChange("1", "modify", "prisma/schema.prisma", "critical", "schema"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("schema");
  });

  it("should show summaries", () => {
    const changes = [
      createChange("1", "modify", "file.ts", "medium", "other"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("Summary for 1");
  });

  it("should show action options", () => {
    const changes = [
      createChange("1", "modify", "file.ts", "medium", "other"),
    ];
    
    const output = formatChangePreview(changes);
    expect(output).toContain("[Apply All]");
    expect(output).toContain("[Review Each]");
    expect(output).toContain("[Skip]");
    expect(output).toContain("[Modify Plan]");
  });

  it("should format multiple changes", () => {
    const changes = [
      createChange("1", "create", "new.ts", "medium", "other"),
      createChange("2", "modify", "existing.ts", "high", "api"),
      createChange("3", "delete", "old.ts", "low", "config"),
    ];
    
    const output = formatChangePreview(changes);
    
    expect(output).toContain("new.ts");
    expect(output).toContain("existing.ts");
    expect(output).toContain("old.ts");
    expect(output).toContain("CREATE");
    expect(output).toContain("MODIFY");
    expect(output).toContain("DELETE");
  });

  it("should use appropriate emojis for change types", () => {
    const changes = [
      createChange("1", "create", "new.ts", "medium", "other"),
      createChange("2", "modify", "edit.ts", "medium", "other"),
      createChange("3", "delete", "remove.ts", "medium", "other"),
    ];
    
    const output = formatChangePreview(changes);
    
    expect(output).toContain("📝");
    expect(output).toContain("✏️");
    expect(output).toContain("🗑️");
  });

  it("should create bordered box layout", () => {
    const changes = [
      createChange("1", "modify", "file.ts", "medium", "other"),
    ];
    
    const output = formatChangePreview(changes);
    
    expect(output).toContain("┌");
    expect(output).toContain("├");
    expect(output).toContain("└");
    expect(output).toContain("│");
  });
});
