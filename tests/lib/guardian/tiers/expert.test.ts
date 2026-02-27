/**
 * Tests for Expert Tier module
 */

import { describe, it, expect } from "vitest";
import {
  EXPERT_CONFIG,
  EXPERT_QUESTIONS,
  getExpertModeConfig,
  formatAdvisorOutput,
  parseTechStackFreeform,
  parseRequirementsFreeform,
  type GuardianRole,
  type ExpertModeConfig,
  type Observation,
  type AdvisorOutput,
} from "../../../../src/lib/guardian/tiers/expert";

describe("Expert Config", () => {
  it("should have correct tier configuration", () => {
    expect(EXPERT_CONFIG.tier).toBe("expert");
    expect(EXPERT_CONFIG.name).toBe("Expert");
    expect(EXPERT_CONFIG.autonomyLevel).toBe(0.25);
    expect(EXPERT_CONFIG.interviewStyle).toBe("freeform");
    expect(EXPERT_CONFIG.showArchitecturePreview).toBe(false);
  });

  it("should use suggestion nudge format", () => {
    expect(EXPERT_CONFIG.nudgeConfig.nudgeFormat).toBe("suggestion");
  });

  it("should have appropriate context thresholds", () => {
    const thresholds = EXPERT_CONFIG.nudgeConfig.contextThresholds;
    expect(thresholds.warning).toBe(0.5);
    expect(thresholds.orange).toBe(0.7);
    expect(thresholds.critical).toBe(0.85);
    expect(thresholds.forceHandoff).toBe(1.0);
  });

  it("should have all hitl as suggestion except security", () => {
    const hitl = EXPERT_CONFIG.hitlConfig;
    expect(hitl.phaseComplete).toBe("suggestion");
    expect(hitl.featureComplete).toBe("suggestion");
    expect(hitl.schemaChange).toBe("suggestion");
    expect(hitl.authChange).toBe("suggestion");
    expect(hitl.buildError).toBe("suggestion");
    expect(hitl.testFailure).toBe("suggestion");
    expect(hitl.newFile).toBe("suggestion");
    expect(hitl.fileModify).toBe("suggestion");
    expect(hitl.securityConcern).toBe("always");
  });

  it("should disable all auto-resolve", () => {
    const autoResolve = EXPERT_CONFIG.autoResolve;
    expect(autoResolve.lintErrors).toBe(false);
    expect(autoResolve.buildErrors).toBe(false);
    expect(autoResolve.testFailures).toBe(false);
    expect(autoResolve.maxRetries).toBe(0);
  });
});

describe("Expert Questions", () => {
  it("should have minimal required questions", () => {
    const keys = EXPERT_QUESTIONS.map(q => q.key);
    expect(keys).toContain("projectName");
    expect(keys).toContain("techStackFreeform");
    expect(keys).toContain("requirementsFreeform");
    expect(keys).toContain("guardianRole");
  });

  it("should have free-form tech stack question", () => {
    const question = EXPERT_QUESTIONS.find(q => q.key === "techStackFreeform");
    expect(question?.type).toBe("textarea");
    expect(question?.required).toBe(true);
    expect(question?.minLength).toBe(20);
    expect(question?.parseAs).toBe("techStack");
  });

  it("should have free-form requirements question", () => {
    const question = EXPERT_QUESTIONS.find(q => q.key === "requirementsFreeform");
    expect(question?.type).toBe("textarea");
    expect(question?.required).toBe(true);
    expect(question?.minLength).toBe(100);
    expect(question?.parseAs).toBe("prd");
  });

  it("should have guardian role question with options", () => {
    const question = EXPERT_QUESTIONS.find(q => q.key === "guardianRole");
    expect(question?.type).toBe("select");
    expect(question?.required).toBe(true);
    expect(question?.options?.length).toBe(4);
    expect(question?.default).toBe("advisor");
  });

  it("should have all guardian role options", () => {
    const question = EXPERT_QUESTIONS.find(q => q.key === "guardianRole");
    const values = question?.options?.map(o => o.value);
    
    expect(values).toContain("silent");
    expect(values).toContain("advisor");
    expect(values).toContain("reviewer");
    expect(values).toContain("guardian");
  });

  it("should have constraints as optional question", () => {
    const question = EXPERT_QUESTIONS.find(q => q.key === "constraints");
    expect(question?.required).toBe(false);
  });
});

describe("getExpertModeConfig", () => {
  it("should configure silent mode correctly", () => {
    const config = getExpertModeConfig("silent");
    
    expect(config.role).toBe("silent");
    expect(config.securityScan.enabled).toBe(false);
    expect(config.securityScan.blockOnCritical).toBe(false);
    expect(config.codeReview.enabled).toBe(false);
    expect(config.suggestions.patterns).toBe(false);
    expect(config.suggestions.performance).toBe(false);
    expect(config.suggestions.security).toBe(false);
    expect(config.suggestions.testing).toBe(false);
  });

  it("should configure advisor mode correctly", () => {
    const config = getExpertModeConfig("advisor");
    
    expect(config.role).toBe("advisor");
    expect(config.securityScan.enabled).toBe(true);
    expect(config.securityScan.blockOnCritical).toBe(true);
    expect(config.codeReview.enabled).toBe(false);
    expect(config.suggestions.patterns).toBe(true);
    expect(config.suggestions.performance).toBe(true);
    expect(config.suggestions.security).toBe(true);
    expect(config.suggestions.testing).toBe(true);
  });

  it("should configure reviewer mode correctly", () => {
    const config = getExpertModeConfig("reviewer");
    
    expect(config.role).toBe("reviewer");
    expect(config.codeReview.enabled).toBe(true);
    expect(config.codeReview.timing).toBe("before_commit");
    expect(config.codeReview.scope).toBe("changed_files");
    expect(config.suggestions.patterns).toBe(true);
  });

  it("should configure guardian mode correctly", () => {
    const config = getExpertModeConfig("guardian");
    
    expect(config.role).toBe("guardian");
    expect(config.codeReview.enabled).toBe(true);
    expect(config.codeReview.timing).toBe("before_commit");
    expect(config.codeReview.scope).toBe("related_files");
    expect(config.securityScan.enabled).toBe(true);
    expect(config.securityScan.blockOnCritical).toBe(true);
  });

  it("should always enable security scan except in silent mode", () => {
    expect(getExpertModeConfig("advisor").securityScan.enabled).toBe(true);
    expect(getExpertModeConfig("reviewer").securityScan.enabled).toBe(true);
    expect(getExpertModeConfig("guardian").securityScan.enabled).toBe(true);
    expect(getExpertModeConfig("silent").securityScan.enabled).toBe(false);
  });

  it("should have different code review scopes for roles", () => {
    expect(getExpertModeConfig("silent").codeReview.scope).toBe("changed_files");
    expect(getExpertModeConfig("advisor").codeReview.scope).toBe("changed_files");
    expect(getExpertModeConfig("reviewer").codeReview.scope).toBe("changed_files");
    expect(getExpertModeConfig("guardian").codeReview.scope).toBe("related_files");
  });
});

describe("formatAdvisorOutput", () => {
  it("should format basic advisor output", () => {
    const output: AdvisorOutput = {
      observations: [],
      suggestions: [],
      warnings: [],
      actionRequired: false,
      summary: "",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("GUARDIAN ADVISOR");
    expect(result).toContain("All actions require your explicit command");
  });

  it("should include observations", () => {
    const output: AdvisorOutput = {
      observations: [
        {
          type: "pattern",
          severity: "info",
          message: "Using useState for local state",
        },
      ],
      suggestions: [],
      warnings: [],
      actionRequired: false,
      summary: "",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("🔍 OBSERVATIONS");
    expect(result).toContain("Using useState for local state");
  });

  it("should include observations with file location", () => {
    const output: AdvisorOutput = {
      observations: [
        {
          type: "pattern",
          severity: "info",
          message: "Complex component",
          file: "src/app.tsx",
          line: 42,
        },
      ],
      suggestions: [],
      warnings: [],
      actionRequired: false,
      summary: "",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("Complex component");
    expect(result).toContain("src/app.tsx:42");
  });

  it("should include suggestions", () => {
    const output: AdvisorOutput = {
      observations: [],
      suggestions: [
        {
          type: "performance",
          severity: "suggestion",
          message: "Consider memoizing this component",
          suggestion: "Wrap with React.memo()",
        },
      ],
      warnings: [],
      actionRequired: false,
      summary: "",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("💡 SUGGESTIONS");
    expect(result).toContain("Consider memoizing this component");
    expect(result).toContain("Wrap with React.memo()");
  });

  it("should include warnings", () => {
    const output: AdvisorOutput = {
      observations: [],
      suggestions: [],
      warnings: [
        {
          type: "security",
          severity: "warning",
          message: "Potential XSS vulnerability",
          file: "src/api.ts",
        },
      ],
      actionRequired: false,
      summary: "",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("⚠️  WARNINGS");
    expect(result).toContain("Potential XSS vulnerability");
    expect(result).toContain("src/api.ts");
  });

  it("should show action required", () => {
    const output: AdvisorOutput = {
      observations: [],
      suggestions: [],
      warnings: [],
      actionRequired: true,
      summary: "Security issue must be addressed",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("🛑 ACTION REQUIRED");
    expect(result).toContain("Security issue must be addressed");
  });

  it("should handle multiple observations", () => {
    const output: AdvisorOutput = {
      observations: [
        {
          type: "pattern",
          severity: "info",
          message: "Observation 1",
        },
        {
          type: "testing",
          severity: "info",
          message: "Observation 2",
        },
      ],
      suggestions: [],
      warnings: [],
      actionRequired: false,
      summary: "",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("Observation 1");
    expect(result).toContain("Observation 2");
  });

  it("should handle all sections together", () => {
    const output: AdvisorOutput = {
      observations: [{ type: "general", severity: "info", message: "Obs" }],
      suggestions: [{ type: "pattern", severity: "suggestion", message: "Sug" }],
      warnings: [{ type: "security", severity: "warning", message: "Warn" }],
      actionRequired: true,
      summary: "Fix issues",
    };

    const result = formatAdvisorOutput(output);

    expect(result).toContain("OBSERVATIONS");
    expect(result).toContain("SUGGESTIONS");
    expect(result).toContain("WARNINGS");
    expect(result).toContain("ACTION REQUIRED");
  });
});

describe("parseTechStackFreeform", () => {
  it("should parse Next.js frontend", () => {
    const text = "Using Next.js 16 with App Router";
    const stack = parseTechStackFreeform(text);

    expect(stack.frontend).toContain("Next");
  });

  it("should parse React + Vite", () => {
    const text = "React + Vite for frontend";
    const stack = parseTechStackFreeform(text);

    expect(stack.frontend).toContain("React");
  });

  it("should parse Vue", () => {
    const text = "Vue.js 3 with Nuxt";
    const stack = parseTechStackFreeform(text);

    expect(stack.frontend).toContain("Vue");
  });

  it("should parse Svelte", () => {
    const text = "SvelteKit for the frontend";
    const stack = parseTechStackFreeform(text);

    expect(stack.frontend).toContain("Svelte");
  });

  it("should parse Convex as backend and database", () => {
    const text = "Convex for backend + realtime";
    const stack = parseTechStackFreeform(text);

    expect(stack.backend).toBe("Convex");
    expect(stack.database).toBe("Convex");
  });

  it("should parse Supabase", () => {
    const text = "Supabase for backend";
    const stack = parseTechStackFreeform(text);

    expect(stack.backend).toBe("Supabase");
    expect(stack.database).toContain("PostgreSQL");
  });

  it("should parse Firebase", () => {
    const text = "Firebase backend";
    const stack = parseTechStackFreeform(text);

    expect(stack.backend).toBe("Firebase");
    expect(stack.database).toBe("Firestore");
  });

  it("should parse Prisma", () => {
    const text = "Prisma ORM with PostgreSQL";
    const stack = parseTechStackFreeform(text);

    expect(stack.backend).toBe("Prisma");
  });

  it("should parse PostgreSQL database", () => {
    const text = "PostgreSQL database";
    const stack = parseTechStackFreeform(text);

    expect(stack.database).toBe("PostgreSQL");
  });

  it("should parse MySQL database", () => {
    const text = "MySQL for data";
    const stack = parseTechStackFreeform(text);

    expect(stack.database).toBe("MySQL");
  });

  it("should parse MongoDB", () => {
    const text = "MongoDB database";
    const stack = parseTechStackFreeform(text);

    expect(stack.database).toBe("MongoDB");
  });

  it("should parse Convex Auth", () => {
    const text = "Convex Auth for authentication";
    const stack = parseTechStackFreeform(text);

    expect(stack.auth).toBe("Convex Auth");
  });

  it("should parse Clerk", () => {
    const text = "Clerk for auth";
    const stack = parseTechStackFreeform(text);

    expect(stack.auth).toBe("Clerk");
  });

  it("should parse NextAuth/Auth.js", () => {
    const text = "Auth.js for authentication";
    const stack = parseTechStackFreeform(text);

    expect(stack.auth).toBe("Auth.js");
  });

  it("should parse Vercel hosting", () => {
    const text = "Deploy to Vercel";
    const stack = parseTechStackFreeform(text);

    expect(stack.hosting).toBe("Vercel");
  });

  it("should parse Netlify", () => {
    const text = "Netlify for hosting";
    const stack = parseTechStackFreeform(text);

    expect(stack.hosting).toBe("Netlify");
  });

  it("should parse Railway", () => {
    const text = "Railway deployment";
    const stack = parseTechStackFreeform(text);

    expect(stack.hosting).toBe("Railway");
  });

  it("should parse AWS", () => {
    const text = "AWS for infrastructure";
    const stack = parseTechStackFreeform(text);

    expect(stack.hosting).toBe("AWS");
  });

  it("should handle case-insensitive input", () => {
    const text = "NEXT.JS 16 WITH CONVEX AND VERCEL";
    const stack = parseTechStackFreeform(text);

    expect(stack.frontend).toBeTruthy();
    expect(stack.frontend.toLowerCase()).toContain("next");
    expect(stack.backend).toBe("Convex");
    expect(stack.hosting).toBe("Vercel");
  });

  it("should handle complex multi-line input", () => {
    const text = `
      - Next.js 16 with App Router
      - Convex for backend + realtime
      - Clerk for auth
      - Vercel for hosting
    `;
    const stack = parseTechStackFreeform(text);

    expect(stack.frontend).toContain("Next");
    expect(stack.backend).toBe("Convex");
    expect(stack.auth).toBe("Clerk");
    expect(stack.hosting).toBe("Vercel");
  });

  it("should handle empty input", () => {
    const stack = parseTechStackFreeform("");

    expect(stack.frontend).toBe("");
    expect(stack.backend).toBe("");
    expect(stack.database).toBe("");
    expect(stack.auth).toBe("");
    expect(stack.hosting).toBe("");
  });
});

describe("parseRequirementsFreeform", () => {
  it("should parse basic target user", () => {
    const text = `
Target user: Small business owners who need simple invoicing
Small business owners who need simple invoicing
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.targetUser).toContain("Small business owners");
  });

  it("should parse jobs to be done", () => {
    const text = `
Jobs:
- Create invoices
- Send to clients
- Track payments
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.jobsToBeDone).toContain("Create invoices");
    expect(result.jobsToBeDone).toContain("Send to clients");
    expect(result.jobsToBeDone).toContain("Track payments");
  });

  it("should parse success criteria", () => {
    const text = `
Success criteria:
- Users can create invoice in < 2 minutes
- 99% uptime
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.successCriteria).toContain("Users can create invoice in < 2 minutes");
    expect(result.successCriteria).toContain("99% uptime");
  });

  it("should parse critical paths", () => {
    const text = `
Critical flows:
- Login → Dashboard → Create Invoice → Send
- View outstanding invoices → Mark as paid
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.criticalPaths.length).toBeGreaterThan(0);
    expect(result.criticalPaths.some(p => p.includes("Login"))).toBe(true);
  });

  it("should handle different section headers", () => {
    const text = `
Audience:
Developers

Features:
- Code review
- Test automation

Must work:
- Fast response time
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.targetUser).toContain("Developers");
    expect(result.jobsToBeDone).toContain("Code review");
    expect(result.successCriteria).toContain("Fast response time");
  });

  it("should handle complex multi-section input", () => {
    const text = `
Target user:
Freelance designers

Jobs to be done:
- Create design portfolios
- Share with clients
- Collect feedback

Success criteria:
- Portfolio loads in < 3 seconds
- Mobile responsive

Critical user flows:
- Sign up → Create portfolio → Add projects → Share link
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.targetUser).toContain("Freelance designers");
    expect(result.jobsToBeDone).toContain("Create design portfolios");
    expect(result.successCriteria).toContain("Portfolio loads in < 3 seconds");
    expect(result.criticalPaths.length).toBeGreaterThan(0);
  });

  it("should handle input without explicit section headers", () => {
    const text = `
For developers who want to automate testing
- Add test coverage
- Generate reports
    `;
    const result = parseRequirementsFreeform(text);

    // Without explicit headers, items get added to jobs by default
    expect(result.jobsToBeDone.length).toBeGreaterThan(0);
  });

  it("should handle empty input", () => {
    const result = parseRequirementsFreeform("");

    expect(result.targetUser).toBe("");
    expect(result.jobsToBeDone).toEqual([]);
    expect(result.successCriteria).toEqual([]);
    expect(result.criticalPaths).toEqual([]);
  });

  it("should trim whitespace from parsed content", () => {
    const text = `
Jobs:
  -    Create invoice    
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.jobsToBeDone[0]).toBe("Create invoice");
  });

  it("should handle multiline target user description", () => {
    const text = `
Target user:
Small business owners who need
simple invoicing and tracking
    `;
    const result = parseRequirementsFreeform(text);

    expect(result.targetUser).toContain("Small business owners");
    expect(result.targetUser).toContain("simple invoicing");
  });
});
