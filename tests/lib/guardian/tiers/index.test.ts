/**
 * Tests for Tiers Index module
 */

import { describe, it, expect } from "vitest";
import {
  getTierConfig,
  getTierInfo,
  TIER_SELECTION_QUESTION,
  type WorkflowTier,
  type TierConfig,
} from "../../../../src/lib/guardian/tiers/index";
import { BEGINNER_CONFIG } from "../../../../src/lib/guardian/tiers/beginner";
import { INTERMEDIATE_CONFIG } from "../../../../src/lib/guardian/tiers/intermediate";
import { ADVANCED_CONFIG } from "../../../../src/lib/guardian/tiers/advanced";
import { EXPERT_CONFIG } from "../../../../src/lib/guardian/tiers/expert";
import { TEAM_CONFIG } from "../../../../src/lib/guardian/tiers/team";

describe("Tiers Index", () => {
  describe("getTierConfig", () => {
    it("should throw error for unknown tier", () => {
      expect(() => getTierConfig("unknown" as WorkflowTier)).toThrow("Unknown tier");
    });
  });

  describe("Direct Config Imports", () => {
    it("should have valid tier configs", () => {
      expect(BEGINNER_CONFIG.tier).toBe("beginner");
      expect(INTERMEDIATE_CONFIG.tier).toBe("intermediate");
      expect(ADVANCED_CONFIG.tier).toBe("advanced");
      expect(EXPERT_CONFIG.tier).toBe("expert");
      expect(TEAM_CONFIG.tier).toBe("team");
    });

    it("should have valid interview styles", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      const validStyles = ["mcq", "guided", "freeform"];
      
      for (const config of configs) {
        expect(validStyles).toContain(config.interviewStyle);
      }
    });

    it("should have autonomy levels in descending order", () => {
      expect(BEGINNER_CONFIG.autonomyLevel).toBeGreaterThan(INTERMEDIATE_CONFIG.autonomyLevel);
      expect(INTERMEDIATE_CONFIG.autonomyLevel).toBeGreaterThan(ADVANCED_CONFIG.autonomyLevel);
      expect(ADVANCED_CONFIG.autonomyLevel).toBeGreaterThan(EXPERT_CONFIG.autonomyLevel);
    });

    it("should have valid nudge configurations", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      
      for (const config of configs) {
        expect(config.nudgeConfig).toBeDefined();
        expect(Array.isArray(config.nudgeConfig.suppressTypes)).toBe(true);
        expect(Array.isArray(config.nudgeConfig.showTypes)).toBe(true);
        expect(["warning", "suggestion", "info"]).toContain(config.nudgeConfig.nudgeFormat);
        
        const thresholds = config.nudgeConfig.contextThresholds;
        expect(thresholds.warning).toBeGreaterThan(0);
        expect(thresholds.orange).toBeGreaterThan(thresholds.warning);
        expect(thresholds.critical).toBeGreaterThan(thresholds.orange);
        expect(thresholds.forceHandoff).toBeGreaterThan(thresholds.critical);
      }
    });

    it("should have valid HITL configurations", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      const validRequirements = ["always", "configurable", "suggestion", "never"];
      
      for (const config of configs) {
        expect(validRequirements).toContain(config.hitlConfig.phaseComplete);
        expect(validRequirements).toContain(config.hitlConfig.featureComplete);
        expect(validRequirements).toContain(config.hitlConfig.schemaChange);
        expect(validRequirements).toContain(config.hitlConfig.authChange);
        expect(validRequirements).toContain(config.hitlConfig.buildError);
        expect(validRequirements).toContain(config.hitlConfig.testFailure);
        expect(validRequirements).toContain(config.hitlConfig.newFile);
        expect(validRequirements).toContain(config.hitlConfig.fileModify);
        expect(validRequirements).toContain(config.hitlConfig.securityConcern);
      }
    });

    it("should have valid auto-resolve configurations", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      
      for (const config of configs) {
        expect(typeof config.autoResolve.lintErrors).toBe("boolean");
        expect(typeof config.autoResolve.buildErrors).toBe("boolean");
        expect(typeof config.autoResolve.testFailures).toBe("boolean");
        expect(typeof config.autoResolve.maxRetries).toBe("number");
        expect(config.autoResolve.maxRetries).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have HITL configuration", () => {
      // All configs should have hitlConfig defined
      const beginnerAlways = Object.values(BEGINNER_CONFIG.hitlConfig).filter((v) => v === "always").length;
      const expertAlways = Object.values(EXPERT_CONFIG.hitlConfig).filter((v) => v === "always").length;
      
      // Both should have at least some HITL requirements
      expect(beginnerAlways).toBeGreaterThan(0);
      expect(expertAlways).toBeGreaterThan(0);
    });
  });

  describe("getTierInfo", () => {
    it("should return info for beginner", () => {
      const info = getTierInfo("beginner");
      
      expect(info.emoji).toBe("🚀");
      expect(info.name).toBe("Beginner");
      expect(info.tagline).toContain("Tell me what you want");
    });

    it("should return info for intermediate", () => {
      const info = getTierInfo("intermediate");
      
      expect(info.emoji).toBe("🎯");
      expect(info.name).toBe("Intermediate");
      expect(info.tagline).toContain("Guide me through");
    });

    it("should return info for advanced", () => {
      const info = getTierInfo("advanced");
      
      expect(info.emoji).toBe("⚙️");
      expect(info.name).toBe("Advanced");
      expect(info.tagline).toContain("show me every turn");
    });

    it("should return info for expert", () => {
      const info = getTierInfo("expert");
      
      expect(info.emoji).toBe("🛠️");
      expect(info.name).toBe("Expert");
      expect(info.tagline).toContain("advisor");
    });

    it("should return info for team", () => {
      const info = getTierInfo("team");
      
      expect(info.emoji).toBe("👥");
      expect(info.name).toBe("Team/Enterprise");
      expect(info.tagline).toContain("Coordinate");
    });

    it("should have unique emojis", () => {
      const tiers: WorkflowTier[] = ["beginner", "intermediate", "advanced", "expert", "team"];
      const emojis = tiers.map((t) => getTierInfo(t).emoji);
      const uniqueEmojis = new Set(emojis);
      
      expect(uniqueEmojis.size).toBe(tiers.length);
    });

    it("should have descriptive taglines", () => {
      const tiers: WorkflowTier[] = ["beginner", "intermediate", "advanced", "expert", "team"];
      
      for (const tier of tiers) {
        const info = getTierInfo(tier);
        expect(info.tagline.length).toBeGreaterThan(10);
      }
    });
  });

  describe("TIER_SELECTION_QUESTION", () => {
    it("should have correct key", () => {
      expect(TIER_SELECTION_QUESTION.key).toBe("workflowTier");
    });

    it("should be a select question", () => {
      expect(TIER_SELECTION_QUESTION.type).toBe("select");
    });

    it("should be required", () => {
      expect(TIER_SELECTION_QUESTION.required).toBe(true);
    });

    it("should have 5 tier options", () => {
      expect(TIER_SELECTION_QUESTION.options?.length).toBe(5);
    });

    it("should have intermediate as default", () => {
      expect(TIER_SELECTION_QUESTION.default).toBe("intermediate");
    });

    it("should have all tier values in options", () => {
      const values = TIER_SELECTION_QUESTION.options?.map((o) => o.value);
      
      expect(values).toContain("beginner");
      expect(values).toContain("intermediate");
      expect(values).toContain("advanced");
      expect(values).toContain("expert");
      expect(values).toContain("team");
    });

    it("should have emojis in option labels", () => {
      for (const option of TIER_SELECTION_QUESTION.options || []) {
        expect(option.label).toMatch(/[🚀🎯⚙️🛠️👥]/);
      }
    });

    it("should have descriptions for all options", () => {
      for (const option of TIER_SELECTION_QUESTION.options || []) {
        expect(option.description).toBeDefined();
        expect(option.description!.length).toBeGreaterThan(20);
      }
    });

    it("should have meaningful descriptions", () => {
      for (const option of TIER_SELECTION_QUESTION.options || []) {
        // Descriptions should be informative (at least 20 chars)
        expect(option.description!.length).toBeGreaterThan(20);
      }
    });

    it("should have descriptive question text", () => {
      expect(TIER_SELECTION_QUESTION.question).toContain("control");
      expect(TIER_SELECTION_QUESTION.question.length).toBeGreaterThan(20);
    });

    it("should order tiers by autonomy level", () => {
      const values = TIER_SELECTION_QUESTION.options?.map((o) => o.value) || [];
      
      expect(values[0]).toBe("beginner"); // Highest autonomy
      expect(values[values.length - 1]).toBe("team");
    });

    it("should have unique values", () => {
      const values = TIER_SELECTION_QUESTION.options?.map((o) => o.value) || [];
      const uniqueValues = new Set(values);
      
      expect(uniqueValues.size).toBe(values.length);
    });

    it("should have unique labels", () => {
      const labels = TIER_SELECTION_QUESTION.options?.map((o) => o.label) || [];
      const uniqueLabels = new Set(labels);
      
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });

  describe("Type Exports", () => {
    it("should export WorkflowTier type", () => {
      const tier: WorkflowTier = "beginner";
      expect(["beginner", "intermediate", "advanced", "expert", "team"]).toContain(tier);
    });

    it("should export TierConfig type", () => {
      const config: TierConfig = BEGINNER_CONFIG;
      expect(config.tier).toBeDefined();
      expect(config.name).toBeDefined();
      expect(config.autonomyLevel).toBeDefined();
    });
  });

  describe("Config Consistency", () => {
    it("should have consistent config structure across tiers", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      
      for (const config of configs) {
        expect(config.tier).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.autonomyLevel).toBeDefined();
        expect(config.interviewStyle).toBeDefined();
        expect(typeof config.showArchitecturePreview).toBe("boolean");
        expect(config.nudgeConfig).toBeDefined();
        expect(config.hitlConfig).toBeDefined();
        expect(config.autoResolve).toBeDefined();
      }
    });

    it("should have autonomy levels between 0 and 1", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      
      for (const config of configs) {
        expect(config.autonomyLevel).toBeGreaterThanOrEqual(0);
        expect(config.autonomyLevel).toBeLessThanOrEqual(1);
      }
    });

    it("should show architecture preview for intermediate and advanced", () => {
      expect(INTERMEDIATE_CONFIG.showArchitecturePreview).toBe(true);
      expect(ADVANCED_CONFIG.showArchitecturePreview).toBe(true);
      // Expert has different showArchitecturePreview setting
    });

    it("should have security concerns as always for all tiers", () => {
      const configs = [BEGINNER_CONFIG, INTERMEDIATE_CONFIG, ADVANCED_CONFIG, EXPERT_CONFIG, TEAM_CONFIG];
      
      for (const config of configs) {
        expect(config.hitlConfig.securityConcern).toBe("always");
      }
    });
  });
});
