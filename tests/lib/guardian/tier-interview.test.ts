/**
 * Tests for Tier Interview module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  askQuestion,
  convertToPRDAnswers,
  type TierInterviewResult,
} from "../../../src/lib/guardian/tier-interview";

// Mock readline
vi.mock("readline", () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn(),
    close: vi.fn(),
  })),
}));

// Mock tier modules
vi.mock("../../../src/lib/guardian/tiers", () => ({
  getTierConfig: vi.fn(() => ({ autoApprove: false })),
  getTierInfo: vi.fn((tier: string) => ({
    name: tier.charAt(0).toUpperCase() + tier.slice(1),
    emoji: "🎯",
    tagline: "Test tier",
  })),
  TIER_SELECTION_QUESTION: {
    question: "Select tier",
    type: "select",
    key: "tier",
    options: [
      { label: "Beginner", value: "beginner", description: "Easy mode" },
      { label: "Intermediate", value: "intermediate", description: "Balanced" },
      { label: "Advanced", value: "advanced", description: "Full control" },
      { label: "Expert", value: "expert", description: "Pro mode" },
      { label: "Team", value: "team", description: "Multi-agent" },
    ],
  },
}));

vi.mock("../../../src/lib/guardian/tiers/beginner", () => ({
  BEGINNER_QUESTIONS: [
    {
      key: "appType",
      question: "What type of app?",
      type: "select",
      options: [
        { label: "SaaS", value: "saas" },
        { label: "Marketplace", value: "marketplace" },
      ],
      default: "saas",
    },
  ],
  BEGINNER_CONDITIONAL_QUESTIONS: [],
  getApplicableQuestions: vi.fn(() => []),
  deriveBeginnerPRD: vi.fn(() => ({
    projectName: "Test Project",
    techStack: { frontend: "Next.js", backend: "Convex" },
    targetUser: "Users",
    jobsToBeDone: ["Task 1"],
    successCriteria: ["Metric 1"],
    criticalPaths: ["Path 1"],
    nonGoals: [],
    timeline: "4 weeks",
    riskAssumptions: [],
    estimatedComplexity: "medium",
    suggestedPhases: 5,
    keyEntities: ["User", "Post"],
    convexSchema: [],
  })),
  generatePhases: vi.fn(() => [
    {
      id: "phase1",
      name: "Phase 1",
      emoji: "🏗️",
      tasks: ["Task 1", "Task 2"],
    },
  ]),
  createInitialRalphState: vi.fn(() => ({ currentPhase: 0 })),
}));

vi.mock("../../../src/lib/guardian/tiers/intermediate", () => ({
  INTERMEDIATE_QUESTIONS: [
    {
      key: "architecture",
      question: "Choose architecture",
      type: "select",
      options: [
        { label: "Monolith", value: "monolith" },
        { label: "Microservices", value: "microservices" },
      ],
      default: "monolith",
    },
  ],
  generateArchitecturePreview: vi.fn(() => "Architecture preview text"),
}));

vi.mock("../../../src/lib/guardian/tiers/advanced", () => ({
  ADVANCED_QUESTIONS: [
    {
      key: "customFeature",
      question: "Custom feature?",
      type: "input",
      default: "Feature X",
    },
  ],
}));

vi.mock("../../../src/lib/guardian/tiers/expert", () => ({
  EXPERT_QUESTIONS: [
    {
      key: "techStack",
      question: "Tech stack?",
      type: "textarea",
      parseAs: "techStack",
      placeholder: "Next.js, Convex, etc.",
    },
  ],
  parseTechStackFreeform: vi.fn((text: string) => ({
    frontend: "Next.js",
    backend: "Convex",
    database: "Postgres",
  })),
}));

vi.mock("../../../src/lib/guardian/tiers/team", () => ({
  TEAM_QUESTIONS: [
    {
      key: "teamSize",
      question: "Team size?",
      type: "select",
      options: [
        { label: "Small (2-3)", value: "small" },
        { label: "Large (5+)", value: "large" },
      ],
      default: "small",
    },
  ],
}));

describe("Tier Interview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("askQuestion", () => {
    it("should return trimmed answer from readline", async () => {
      const mockRl = {
        question: vi.fn((prompt, callback) => {
          callback("  test answer  ");
        }),
        close: vi.fn(),
      };

      const answer = await askQuestion(mockRl as any, "Question: ");

      expect(answer).toBe("test answer");
      expect(mockRl.question).toHaveBeenCalledWith("Question: ", expect.any(Function));
    });

    it("should handle empty answers", async () => {
      const mockRl = {
        question: vi.fn((prompt, callback) => {
          callback("");
        }),
        close: vi.fn(),
      };

      const answer = await askQuestion(mockRl as any, "Question: ");

      expect(answer).toBe("");
    });

    it("should preserve answers with special characters", async () => {
      const mockRl = {
        question: vi.fn((prompt, callback) => {
          callback("test@example.com");
        }),
        close: vi.fn(),
      };

      const answer = await askQuestion(mockRl as any, "Email: ");

      expect(answer).toBe("test@example.com");
    });
  });

  describe("convertToPRDAnswers", () => {
    it("should convert answers to PRD format", () => {
      const answers = {
        projectName: "My App",
        techStack: {
          frontend: "React",
          backend: "Node",
          database: "MongoDB",
        },
        targetUser: "Developers",
        jobsToBeDone: ["Job 1", "Job 2"],
        successCriteria: ["Metric 1"],
        criticalPaths: ["Path 1"],
        nonGoals: ["Not this"],
        timeline: "6 weeks",
        riskAssumptions: ["Risk 1"],
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toBe("My App");
      expect(prd.techStack.frontend).toBe("React");
      expect(prd.techStack.backend).toBe("Node");
      expect(prd.targetUser).toBe("Developers");
      expect(prd.jobsToBeDone).toEqual(["Job 1", "Job 2"]);
      expect(prd.timeline).toBe("6 weeks");
    });

    it("should use defaults for missing values", () => {
      const answers = {};

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toBe("MyProject");
      expect(prd.techStack.frontend).toBe("Next.js 16");
      expect(prd.techStack.backend).toBe("Convex");
      expect(prd.techStack.auth).toBe("Convex Auth");
      expect(prd.jobsToBeDone).toEqual([]);
      expect(prd.criticalPaths).toEqual([]);
    });

    it("should handle partial tech stack", () => {
      const answers = {
        techStack: {
          frontend: "Vue.js",
        },
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.techStack.frontend).toBe("Vue.js");
      expect(prd.techStack.backend).toBe("Convex");
      expect(prd.techStack.database).toBe("Convex");
    });

    it("should handle arrays correctly", () => {
      const answers = {
        jobsToBeDone: ["Task A", "Task B", "Task C"],
        successCriteria: ["Metric X"],
        criticalPaths: [],
        nonGoals: ["Avoid this", "Skip that"],
        riskAssumptions: ["Assumption 1"],
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.jobsToBeDone).toHaveLength(3);
      expect(prd.successCriteria).toHaveLength(1);
      expect(prd.criticalPaths).toEqual([]);
      expect(prd.nonGoals).toHaveLength(2);
      expect(prd.riskAssumptions).toHaveLength(1);
    });

    it("should handle empty string values", () => {
      const answers = {
        projectName: "",
        targetUser: "",
        timeline: "",
      };

      const prd = convertToPRDAnswers(answers);

      // Empty project name defaults to "MyProject"
      expect(prd.projectName).toBe("MyProject");
      expect(prd.targetUser).toBe("");
      expect(prd.timeline).toBe("");
    });

    it("should not modify original answers object", () => {
      const answers = {
        projectName: "Original",
        techStack: { frontend: "React" },
      };

      const originalCopy = JSON.parse(JSON.stringify(answers));
      convertToPRDAnswers(answers);

      expect(answers).toEqual(originalCopy);
    });
  });

  describe("tier-specific conversions", () => {
    it("should handle beginner tier answers", () => {
      const answers = {
        appType: "saas",
        hasAuth: true,
        needsPayments: false,
        projectName: "Beginner App",
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toBe("Beginner App");
      expect(prd).toHaveProperty("techStack");
    });

    it("should handle intermediate tier answers", () => {
      const answers = {
        architecture: "monolith",
        projectName: "Intermediate App",
        techStack: {
          frontend: "Next.js",
          backend: "Convex",
          database: "PostgreSQL",
        },
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toBe("Intermediate App");
      expect(prd.techStack.database).toBe("PostgreSQL");
    });

    it("should handle expert tier freeform input", () => {
      const answers = {
        techStack: {
          frontend: "Svelte",
          backend: "Deno",
          database: "EdgeDB",
          auth: "Custom OAuth",
          hosting: "Fly.io",
        },
        projectName: "Expert App",
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.techStack.frontend).toBe("Svelte");
      expect(prd.techStack.backend).toBe("Deno");
      expect(prd.techStack.auth).toBe("Custom OAuth");
    });

    it("should handle team tier with additional fields", () => {
      const answers = {
        projectName: "Team Project",
        teamSize: "large",
        workflow: "gitflow",
        techStack: {
          frontend: "React",
          backend: "Node",
        },
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toBe("Team Project");
      expect(prd.techStack.frontend).toBe("React");
      // Extra fields should be preserved in answers but not affect PRD structure
      expect(prd).toHaveProperty("techStack");
    });
  });

  describe("edge cases", () => {
    it("should handle null tech stack", () => {
      const answers = {
        techStack: null,
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.techStack).toBeDefined();
      expect(prd.techStack.frontend).toBe("Next.js 16");
    });

    it("should handle undefined arrays", () => {
      const answers = {
        jobsToBeDone: undefined,
        successCriteria: undefined,
        criticalPaths: undefined,
        nonGoals: undefined,
        riskAssumptions: undefined,
      };

      const prd = convertToPRDAnswers(answers);

      expect(Array.isArray(prd.jobsToBeDone)).toBe(true);
      expect(Array.isArray(prd.successCriteria)).toBe(true);
      expect(Array.isArray(prd.criticalPaths)).toBe(true);
      expect(Array.isArray(prd.nonGoals)).toBe(true);
      expect(Array.isArray(prd.riskAssumptions)).toBe(true);
    });

    it("should handle non-string project name", () => {
      const answers = {
        projectName: 123,
      };

      const prd = convertToPRDAnswers(answers as any);

      // Type coercion or default behavior
      expect(typeof prd.projectName === "string" || typeof prd.projectName === "number").toBe(true);
    });

    it("should handle tech stack with extra properties", () => {
      const answers = {
        techStack: {
          frontend: "Angular",
          backend: "Rails",
          database: "MySQL",
          auth: "JWT",
          hosting: "AWS",
          extraProp: "should be ignored in PRD",
          anotherExtra: "also ignored",
        },
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.techStack.frontend).toBe("Angular");
      expect(prd.techStack.backend).toBe("Rails");
      expect(prd.techStack.database).toBe("MySQL");
      expect(prd.techStack.auth).toBe("JWT");
      expect(prd.techStack.hosting).toBe("AWS");
    });

    it("should handle arrays with mixed types", () => {
      const answers = {
        jobsToBeDone: ["string", 123, true, null, undefined] as any,
      };

      const prd = convertToPRDAnswers(answers);

      expect(Array.isArray(prd.jobsToBeDone)).toBe(true);
      expect(prd.jobsToBeDone).toHaveLength(5);
    });

    it("should handle very long strings", () => {
      const longString = "x".repeat(10000);
      const answers = {
        projectName: longString,
        targetUser: longString,
        timeline: longString,
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toHaveLength(10000);
      expect(prd.targetUser).toHaveLength(10000);
      expect(prd.timeline).toHaveLength(10000);
    });

    it("should handle special characters in strings", () => {
      const answers = {
        projectName: "App with 'quotes' and \"double quotes\"",
        targetUser: "Users <script>alert('xss')</script>",
        timeline: "Week 1\nWeek 2\tWeek 3",
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toContain("'quotes'");
      expect(prd.targetUser).toContain("<script>");
      expect(prd.timeline).toContain("\n");
    });

    it("should handle unicode and emoji in strings", () => {
      const answers = {
        projectName: "My App 🚀",
        targetUser: "Developers 👨‍💻👩‍💻",
        jobsToBeDone: ["Task 1 ✅", "Task 2 🔥"],
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.projectName).toBe("My App 🚀");
      expect(prd.targetUser).toBe("Developers 👨‍💻👩‍💻");
      expect(prd.jobsToBeDone[0]).toBe("Task 1 ✅");
    });
  });

  describe("tech stack variations", () => {
    it("should handle all-custom tech stack", () => {
      const answers = {
        techStack: {
          frontend: "Custom Framework",
          backend: "Custom Backend",
          database: "Custom DB",
          auth: "Custom Auth",
          hosting: "Custom Host",
        },
      };

      const prd = convertToPRDAnswers(answers);

      expect(prd.techStack.frontend).toBe("Custom Framework");
      expect(prd.techStack.backend).toBe("Custom Backend");
      expect(prd.techStack.database).toBe("Custom DB");
      expect(prd.techStack.auth).toBe("Custom Auth");
      expect(prd.techStack.hosting).toBe("Custom Host");
    });

    it("should handle empty strings in tech stack", () => {
      const answers = {
        techStack: {
          frontend: "",
          backend: "",
          database: "",
        },
      };

      const prd = convertToPRDAnswers(answers);

      // Empty strings should be preserved or defaulted
      expect(typeof prd.techStack.frontend).toBe("string");
      expect(typeof prd.techStack.backend).toBe("string");
    });
  });
});
