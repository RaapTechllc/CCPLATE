/**
 * Tests for Intermediate Tier module
 */

import { describe, it, expect } from "vitest";
import {
  INTERMEDIATE_CONFIG,
  INTERMEDIATE_QUESTIONS,
  generateArchitecturePreview,
} from "../../../../src/lib/guardian/tiers/intermediate";

describe("Intermediate Config", () => {
  it("should have correct tier configuration", () => {
    expect(INTERMEDIATE_CONFIG.tier).toBe("intermediate");
    expect(INTERMEDIATE_CONFIG.name).toBe("Intermediate");
    expect(INTERMEDIATE_CONFIG.autonomyLevel).toBe(0.75);
    expect(INTERMEDIATE_CONFIG.interviewStyle).toBe("guided");
    expect(INTERMEDIATE_CONFIG.showArchitecturePreview).toBe(true);
  });

  it("should suppress commit nudges", () => {
    expect(INTERMEDIATE_CONFIG.nudgeConfig.suppressTypes).toContain("commit");
  });

  it("should show important event types", () => {
    const showTypes = INTERMEDIATE_CONFIG.nudgeConfig.showTypes;
    expect(showTypes).toContain("test");
    expect(showTypes).toContain("lint");
    expect(showTypes).toContain("error");
    expect(showTypes).toContain("hitl_required");
    expect(showTypes).toContain("phase_complete");
    expect(showTypes).toContain("feature_complete");
  });

  it("should have appropriate context thresholds", () => {
    const thresholds = INTERMEDIATE_CONFIG.nudgeConfig.contextThresholds;
    expect(thresholds.warning).toBe(0.5);
    expect(thresholds.orange).toBe(0.7);
    expect(thresholds.critical).toBe(0.85);
    expect(thresholds.forceHandoff).toBe(0.95);
  });

  it("should require HITL at phase and feature boundaries", () => {
    expect(INTERMEDIATE_CONFIG.hitlConfig.phaseComplete).toBe("always");
    expect(INTERMEDIATE_CONFIG.hitlConfig.featureComplete).toBe("always");
    expect(INTERMEDIATE_CONFIG.hitlConfig.authChange).toBe("always");
    expect(INTERMEDIATE_CONFIG.hitlConfig.buildError).toBe("always");
    expect(INTERMEDIATE_CONFIG.hitlConfig.testFailure).toBe("always");
    expect(INTERMEDIATE_CONFIG.hitlConfig.securityConcern).toBe("always");
  });

  it("should make schema changes a suggestion", () => {
    expect(INTERMEDIATE_CONFIG.hitlConfig.schemaChange).toBe("suggestion");
  });

  it("should not require HITL for file changes", () => {
    expect(INTERMEDIATE_CONFIG.hitlConfig.newFile).toBe("never");
    expect(INTERMEDIATE_CONFIG.hitlConfig.fileModify).toBe("never");
  });

  it("should auto-resolve lint errors only", () => {
    expect(INTERMEDIATE_CONFIG.autoResolve.lintErrors).toBe(true);
    expect(INTERMEDIATE_CONFIG.autoResolve.buildErrors).toBe(false);
    expect(INTERMEDIATE_CONFIG.autoResolve.testFailures).toBe(false);
    expect(INTERMEDIATE_CONFIG.autoResolve.maxRetries).toBe(3);
  });
});

describe("Intermediate Questions", () => {
  it("should have all required PRD questions", () => {
    const keys = INTERMEDIATE_QUESTIONS.map(q => q.key);
    
    expect(keys).toContain("projectName");
    expect(keys).toContain("techStack.frontend");
    expect(keys).toContain("techStack.backend");
    expect(keys).toContain("techStack.auth");
    expect(keys).toContain("techStack.hosting");
    expect(keys).toContain("targetUser");
    expect(keys).toContain("jobsToBeDone");
    expect(keys).toContain("successCriteria");
    expect(keys).toContain("criticalPaths");
    expect(keys).toContain("nonGoals");
    expect(keys).toContain("timeline");
  });

  it("should have project name with length constraints", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "projectName");
    
    expect(question?.type).toBe("input");
    expect(question?.required).toBe(true);
    expect(question?.minLength).toBe(2);
    expect(question?.maxLength).toBe(50);
  });

  it("should have frontend options with rationale", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.frontend");
    
    expect(question?.type).toBe("select");
    expect(question?.showRationale).toBe(true);
    expect(question?.options?.length).toBeGreaterThan(0);
    expect(question?.default).toBe("Next.js 16");
  });

  it("should have Next.js as recommended frontend", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.frontend");
    const nextOption = question?.options?.find(o => o.value === "Next.js 16");
    
    expect(nextOption?.label).toContain("Recommended");
    expect(nextOption?.description).toBeTruthy();
  });

  it("should have backend options with rationale", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.backend");
    
    expect(question?.type).toBe("select");
    expect(question?.showRationale).toBe(true);
    expect(question?.default).toBe("Convex");
  });

  it("should have Convex as recommended backend", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.backend");
    const convexOption = question?.options?.find(o => o.value === "Convex");
    
    expect(convexOption?.label).toContain("Recommended");
    expect(convexOption?.description).toContain("Real-time");
  });

  it("should have auth question with condition", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.auth");
    
    expect(question?.type).toBe("select");
    expect(question?.condition).toBeDefined();
    expect(question?.default).toBe("Convex Auth");
  });

  it("should skip auth question when backend is none", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.auth");
    
    if (question?.condition) {
      const shouldShow = question.condition({ "techStack.backend": "none" });
      expect(shouldShow).toBe(false);
    }
  });

  it("should show auth question when backend is selected", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.auth");
    
    if (question?.condition) {
      const shouldShow = question.condition({ "techStack.backend": "Convex" });
      expect(shouldShow).toBe(true);
    }
  });

  it("should have Vercel as recommended hosting", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "techStack.hosting");
    
    expect(question?.default).toBe("Vercel");
    
    const vercelOption = question?.options?.find(o => o.value === "Vercel");
    expect(vercelOption?.label).toContain("Recommended");
  });

  it("should have target user with length constraints", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "targetUser");
    
    expect(question?.type).toBe("input");
    expect(question?.required).toBe(true);
    expect(question?.minLength).toBe(20);
    expect(question?.maxLength).toBe(300);
  });

  it("should have jobs-to-be-done as multiselect", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "jobsToBeDone");
    
    expect(question?.type).toBe("multiselect");
    expect(question?.required).toBe(true);
    expect(question?.minSelect).toBe(2);
    expect(question?.maxSelect).toBe(5);
    expect(question?.allowCustom).toBe(true);
  });

  it("should have predefined job options", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "jobsToBeDone");
    
    expect(question?.options?.length).toBeGreaterThan(0);
    
    const hasAccountMgmt = question?.options?.some(o => 
      o.value === "Account management"
    );
    expect(hasAccountMgmt).toBe(true);
  });

  it("should have success criteria as multiselect", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "successCriteria");
    
    expect(question?.type).toBe("multiselect");
    expect(question?.required).toBe(true);
    expect(question?.minSelect).toBe(3);
    expect(question?.maxSelect).toBe(10);
    expect(question?.allowCustom).toBe(true);
  });

  it("should have critical paths as multiselect", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "criticalPaths");
    
    expect(question?.type).toBe("multiselect");
    expect(question?.required).toBe(true);
    expect(question?.minSelect).toBe(2);
    expect(question?.maxSelect).toBe(5);
    expect(question?.allowCustom).toBe(true);
  });

  it("should have non-goals as optional multiselect", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "nonGoals");
    
    expect(question?.type).toBe("multiselect");
    expect(question?.required).toBe(false);
    expect(question?.minSelect).toBe(0);
    expect(question?.allowCustom).toBe(true);
  });

  it("should have timeline with emoji options", () => {
    const question = INTERMEDIATE_QUESTIONS.find(q => q.key === "timeline");
    
    expect(question?.type).toBe("select");
    expect(question?.default).toBe("week");
    
    const options = question?.options?.map(o => o.value);
    expect(options).toContain("asap");
    expect(options).toContain("week");
    expect(options).toContain("month");
    expect(options).toContain("quality");
  });

  it("should provide descriptions for all major options", () => {
    const techQuestions = INTERMEDIATE_QUESTIONS.filter(q => 
      q.key.startsWith("techStack.")
    );
    
    for (const question of techQuestions) {
      expect(question.options).toBeDefined();
      
      for (const option of question.options || []) {
        expect(option.description).toBeTruthy();
      }
    }
  });
});

describe("generateArchitecturePreview", () => {
  it("should generate preview for Convex stack", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Convex",
      "techStack.auth": "Convex Auth",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("ARCHITECTURE PREVIEW");
    expect(preview).toContain("Next.js 16");
    expect(preview).toContain("Convex");
    expect(preview).toContain("Vercel");
  });

  it("should show Convex-specific structure", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Convex",
      "techStack.auth": "Convex Auth",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("convex/");
    expect(preview).toContain("schema.ts");
    expect(preview).toContain("functions/");
    expect(preview).toContain("auth.config.ts");
  });

  it("should show Prisma structure for non-Convex backend", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Next.js API Routes + Prisma",
      "techStack.auth": "Clerk",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("prisma/");
    expect(preview).toContain("schema.prisma");
    expect(preview).not.toContain("convex/");
  });

  it("should include project structure", () => {
    const answers = {
      "techStack.frontend": "React (Vite)",
      "techStack.backend": "Express + PostgreSQL",
      "techStack.auth": "Auth.js",
      "techStack.hosting": "Railway",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("Project Structure");
    expect(preview).toContain("src/");
    expect(preview).toContain("app/");
    expect(preview).toContain("components/");
    expect(preview).toContain("lib/");
    expect(preview).toContain("public/");
  });

  it("should show auth routes", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Convex",
      "techStack.auth": "Convex Auth",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("(auth)/");
    expect(preview).toContain("(dashboard)/");
  });

  it("should include tech stack summary", () => {
    const answers = {
      "techStack.frontend": "Vue 3 (Nuxt)",
      "techStack.backend": "tRPC + Prisma",
      "techStack.auth": "Clerk",
      "techStack.hosting": "Netlify",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("Tech Stack:");
    expect(preview).toContain("Frontend: Vue 3 (Nuxt)");
    expect(preview).toContain("Backend: tRPC + Prisma");
    expect(preview).toContain("Auth: Clerk");
    expect(preview).toContain("Hosting: Netlify");
  });

  it("should show estimated phases and checkpoints", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Convex",
      "techStack.auth": "Convex Auth",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("Estimated Phases: 4");
    expect(preview).toContain("HITL Checkpoints: 4");
  });

  it("should show Convex-specific key decisions", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Convex",
      "techStack.auth": "Convex Auth",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("Key Decisions:");
    expect(preview).toContain("Using Convex for real-time sync");
    expect(preview).toContain("convex/schema.ts");
  });

  it("should show traditional backend key decisions", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Next.js API Routes + Prisma",
      "techStack.auth": "Auth.js",
      "techStack.hosting": "Vercel",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("Traditional REST/GraphQL API");
    expect(preview).toContain("Database requires separate setup");
    expect(preview).toContain("caching strategy");
  });

  it("should handle missing answers gracefully", () => {
    const answers = {};
    
    expect(() => generateArchitecturePreview(answers)).not.toThrow();
    
    const preview = generateArchitecturePreview(answers);
    expect(preview).toContain("ARCHITECTURE PREVIEW");
  });

  it("should handle partial answers", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Convex",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("Next.js 16");
    expect(preview).toContain("Convex");
  });

  it("should differentiate between Convex and non-Convex", () => {
    const convexAnswers = {
      "techStack.backend": "Convex",
    };
    
    const prismaAnswers = {
      "techStack.backend": "Prisma",
    };
    
    const convexPreview = generateArchitecturePreview(convexAnswers);
    const prismaPreview = generateArchitecturePreview(prismaAnswers);
    
    expect(convexPreview).toContain("convex/");
    expect(prismaPreview).toContain("prisma/");
    expect(convexPreview).not.toContain("prisma/");
    expect(prismaPreview).not.toContain("convex/");
  });

  it("should include UI and feature component folders", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("components/");
    expect(preview).toContain("ui/");
    expect(preview).toContain("features/");
  });

  it("should mention App Router for Next.js", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("App Router");
  });

  it("should show API routes section when applicable", () => {
    const answers = {
      "techStack.frontend": "Next.js 16",
      "techStack.backend": "Next.js API Routes + Prisma",
    };
    
    const preview = generateArchitecturePreview(answers);
    
    expect(preview).toContain("api/");
  });
});
