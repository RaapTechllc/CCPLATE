/**
 * Tests for Team/Enterprise Tier module
 */

import { describe, it, expect } from "vitest";
import {
  TEAM_CONFIG,
  TEAM_QUESTIONS,
  AGENT_CONFIGS,
  DEFAULT_KNOWLEDGE_SHARE_CONFIG,
  formatTeamDashboard,
  decomposeTask,
  type TeamCoordinationState,
  type WorkChunk,
  type TeamMember,
} from "../../../../src/lib/guardian/tiers/team";

describe("Team Config", () => {
  it("should have correct tier configuration", () => {
    expect(TEAM_CONFIG.tier).toBe("team");
    expect(TEAM_CONFIG.name).toBe("Team/Enterprise");
    expect(TEAM_CONFIG.autonomyLevel).toBe(0.6);
    expect(TEAM_CONFIG.interviewStyle).toBe("guided");
    expect(TEAM_CONFIG.showArchitecturePreview).toBe(true);
  });

  it("should have nudge configuration with correct thresholds", () => {
    expect(TEAM_CONFIG.nudgeConfig).toBeDefined();
    expect(TEAM_CONFIG.nudgeConfig.contextThresholds.warning).toBe(0.4);
    expect(TEAM_CONFIG.nudgeConfig.contextThresholds.orange).toBe(0.6);
    expect(TEAM_CONFIG.nudgeConfig.contextThresholds.critical).toBe(0.8);
    expect(TEAM_CONFIG.nudgeConfig.contextThresholds.forceHandoff).toBe(0.95);
  });

  it("should have all required show types in nudgeConfig", () => {
    const requiredTypes = ["commit", "test", "lint", "error", "hitl_required", "progress"];
    for (const type of requiredTypes) {
      expect(TEAM_CONFIG.nudgeConfig.showTypes).toContain(type);
    }
  });

  it("should have hitlConfig with correct security settings", () => {
    expect(TEAM_CONFIG.hitlConfig.schemaChange).toBe("always");
    expect(TEAM_CONFIG.hitlConfig.authChange).toBe("always");
    expect(TEAM_CONFIG.hitlConfig.securityConcern).toBe("always");
    expect(TEAM_CONFIG.hitlConfig.newFile).toBe("never");
    expect(TEAM_CONFIG.hitlConfig.fileModify).toBe("never");
  });

  it("should have autoResolve configuration", () => {
    expect(TEAM_CONFIG.autoResolve.lintErrors).toBe(true);
    expect(TEAM_CONFIG.autoResolve.buildErrors).toBe(true);
    expect(TEAM_CONFIG.autoResolve.testFailures).toBe(true);
    expect(TEAM_CONFIG.autoResolve.maxRetries).toBe(3);
  });
});

describe("Team Questions", () => {
  it("should have all required standard PRD questions", () => {
    const requiredKeys = [
      "projectName",
      "techStack.frontend",
      "techStack.backend",
      "techStack.database",
      "techStack.auth",
      "techStack.hosting",
      "targetUser",
      "jobsToBeDone",
      "successCriteria",
      "criticalPaths",
    ];

    for (const key of requiredKeys) {
      const question = TEAM_QUESTIONS.find(q => q.key === key);
      expect(question, `Question with key ${key} should exist`).toBeDefined();
      expect(question?.required).toBe(true);
    }
  });

  it("should have team-specific questions", () => {
    const teamKeys = [
      "teamStructure",
      "parallelization",
      "mergeStrategy",
      "maxConcurrentWorktrees",
      "notifications",
      "schemaLockBehavior",
    ];

    for (const key of teamKeys) {
      const question = TEAM_QUESTIONS.find(q => q.key === key);
      expect(question, `Team question ${key} should exist`).toBeDefined();
    }
  });

  it("should have valid options for teamStructure", () => {
    const question = TEAM_QUESTIONS.find(q => q.key === "teamStructure");
    expect(question?.options).toBeDefined();
    expect(question?.options?.length).toBe(4);
    
    const values = question?.options?.map(o => o.value);
    expect(values).toContain("solo_agent");
    expect(values).toContain("multi_human");
    expect(values).toContain("multi_agent");
    expect(values).toContain("mixed");
  });

  it("should have valid parallelization strategies", () => {
    const question = TEAM_QUESTIONS.find(q => q.key === "parallelization");
    const values = question?.options?.map(o => o.value);
    
    expect(values).toContain("sequential");
    expect(values).toContain("feature");
    expect(values).toContain("layer");
    expect(values).toContain("max");
  });

  it("should have valid merge strategies", () => {
    const question = TEAM_QUESTIONS.find(q => q.key === "mergeStrategy");
    const values = question?.options?.map(o => o.value);
    
    expect(values).toContain("auto");
    expect(values).toContain("human");
    expect(values).toContain("lead");
    expect(values).toContain("oracle_human");
    expect(question?.default).toBe("oracle_human");
  });

  it("should have maxConcurrentWorktrees options", () => {
    const question = TEAM_QUESTIONS.find(q => q.key === "maxConcurrentWorktrees");
    const values = question?.options?.map(o => o.value);
    
    expect(values).toContain("2");
    expect(values).toContain("3");
    expect(values).toContain("5");
    expect(values).toContain("unlimited");
    expect(question?.default).toBe("3");
  });

  it("should have notification channels", () => {
    const question = TEAM_QUESTIONS.find(q => q.key === "notifications");
    expect(question?.type).toBe("multiselect");
    
    const values = question?.options?.map(o => o.value);
    expect(values).toContain("slack");
    expect(values).toContain("discord");
    expect(values).toContain("email");
    expect(values).toContain("github");
    expect(values).toContain("inapp");
  });

  it("should have schema lock behavior options", () => {
    const question = TEAM_QUESTIONS.find(q => q.key === "schemaLockBehavior");
    const values = question?.options?.map(o => o.value);
    
    expect(values).toContain("exclusive");
    expect(values).toContain("queue");
    expect(values).toContain("advisory");
    expect(question?.default).toBe("exclusive");
  });
});

describe("Agent Configs", () => {
  it("should have all agent type configurations", () => {
    expect(AGENT_CONFIGS.implementer).toBeDefined();
    expect(AGENT_CONFIGS.reviewer).toBeDefined();
    expect(AGENT_CONFIGS.tester).toBeDefined();
    expect(AGENT_CONFIGS.coordinator).toBeDefined();
  });

  it("should configure implementer correctly", () => {
    const config = AGENT_CONFIGS.implementer;
    expect(config.type).toBe("implementer");
    expect(config.autoResolve.lintErrors).toBe(true);
    expect(config.autoResolve.buildErrors).toBe(true);
    expect(config.commitOnSuccess).toBe(true);
  });

  it("should configure reviewer correctly", () => {
    const config = AGENT_CONFIGS.reviewer;
    expect(config.type).toBe("reviewer");
    expect(config.autoResolve.lintErrors).toBe(false);
    expect(config.autoResolve.buildErrors).toBe(false);
    expect(config.commitOnSuccess).toBe(false);
    expect(config.blockOnWarning).toBe(true);
  });

  it("should configure tester with coverage requirement", () => {
    const config = AGENT_CONFIGS.tester;
    expect(config.type).toBe("tester");
    expect(config.requireCoverage).toBe(0.8);
    expect(config.commitOnSuccess).toBe(true);
  });

  it("should configure coordinator correctly", () => {
    const config = AGENT_CONFIGS.coordinator;
    expect(config.type).toBe("coordinator");
    expect(config.autoResolve.lintErrors).toBe(true);
    expect(config.autoResolve.buildErrors).toBe(true);
    expect(config.commitOnSuccess).toBe(false);
  });
});

describe("Knowledge Share Config", () => {
  it("should have default auto-share settings", () => {
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.autoShare).toContain("api_changes");
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.autoShare).toContain("schema_changes");
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.autoShare).toContain("breaking_changes");
  });

  it("should broadcast on complete", () => {
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.broadcastOnComplete).toBe(true);
  });

  it("should have priority topics", () => {
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.priorityTopics).toContain("auth");
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.priorityTopics).toContain("api");
    expect(DEFAULT_KNOWLEDGE_SHARE_CONFIG.priorityTopics).toContain("schema");
  });
});

describe("formatTeamDashboard", () => {
  const createMockState = (): TeamCoordinationState => ({
    sessionId: "test-session-12345678901234567890",
    teamStructure: "mixed",
    parallelStrategy: "feature",
    mergeStrategy: "oracle_human",
    members: [
      {
        id: "human-1",
        type: "human",
        name: "Alice",
        role: "lead",
        status: "active",
        worktreeId: "wt-main",
      },
      {
        id: "agent-1",
        type: "agent",
        name: "Guardian-1",
        role: "developer",
        status: "active",
        worktreeId: "wt-feature-1",
      },
      {
        id: "agent-2",
        type: "agent",
        name: "Guardian-2",
        role: "tester",
        status: "idle",
      },
    ],
    chunks: [
      {
        id: "chunk-1",
        description: "Database schema",
        files: ["prisma/schema.prisma"],
        dependsOn: [],
        status: "complete",
        assignedTo: "agent-1",
      },
      {
        id: "chunk-2",
        description: "API endpoints",
        files: ["src/api/users.ts"],
        dependsOn: ["chunk-1"],
        status: "in_progress",
        assignedTo: "agent-1",
      },
      {
        id: "chunk-3",
        description: "Frontend UI",
        files: ["src/components/UserList.tsx"],
        dependsOn: ["chunk-2"],
        status: "pending",
      },
    ],
    activeWorktrees: ["wt-main", "wt-feature-1"],
    maxConcurrentWorktrees: 3,
    schemaLockHolder: "agent-1",
    pendingMerges: ["wt-feature-1"],
  });

  it("should format basic dashboard structure", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("TEAM COORDINATION DASHBOARD");
    expect(output).toContain("TEAM MEMBERS");
    expect(output).toContain("WORK CHUNKS");
  });

  it("should show session info", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("Session: test-session-1234567");
    expect(output).toContain("Strategy: feature");
    expect(output).toContain("Merge: oracle_human");
  });

  it("should show worktree count", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("Worktrees: 2/3");
  });

  it("should list team members with emojis", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("👤");
    expect(output).toContain("🤖");
    expect(output).toContain("Alice");
    expect(output).toContain("Guardian-1");
    expect(output).toContain("Guardian-2");
  });

  it("should show member status", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("🟢"); // active
    expect(output).toContain("🟡"); // idle
  });

  it("should show member worktrees", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("wt-main");
    expect(output).toContain("wt-feature-1");
  });

  it("should list work chunks with status emojis", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("✅"); // complete
    expect(output).toContain("▶️"); // in_progress
    expect(output).toContain("⏳"); // pending
  });

  it("should show chunk dependencies", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("Depends on: chunk-1");
  });

  it("should show schema lock", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("🔐 Schema Lock: agent-1");
  });

  it("should show pending merges", () => {
    const state = createMockState();
    const output = formatTeamDashboard(state);
    
    expect(output).toContain("📥 Pending Merges");
    expect(output).toContain("wt-feature-1");
  });

  it("should handle state without schema lock", () => {
    const state = createMockState();
    delete state.schemaLockHolder;
    const output = formatTeamDashboard(state);
    
    expect(output).not.toContain("🔐 Schema Lock");
  });

  it("should handle state with no pending merges", () => {
    const state = createMockState();
    state.pendingMerges = [];
    const output = formatTeamDashboard(state);
    
    expect(output).not.toContain("📥 Pending Merges");
  });
});

describe("decomposeTask", () => {
  it("should return single chunk for sequential strategy", () => {
    const files = ["src/app.ts", "src/api.ts", "src/test.ts"];
    const chunks = decomposeTask("Build feature", files, "sequential");
    
    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toBe("main");
    expect(chunks[0].files).toEqual(files);
    expect(chunks[0].dependsOn).toEqual([]);
    expect(chunks[0].status).toBe("pending");
  });

  it("should group files by type", () => {
    const files = [
      "src/components/Button.tsx",
      "src/api/users.ts",
      "prisma/schema.prisma",
      "src/components/Button.test.tsx",
    ];
    const chunks = decomposeTask("Build feature", files, "layer");
    
    // Should have separate chunks for database, backend, frontend, tests
    expect(chunks.length).toBeGreaterThan(1);
    
    const dbChunk = chunks.find(c => c.id === "database");
    expect(dbChunk).toBeDefined();
    expect(dbChunk?.files).toContain("prisma/schema.prisma");
  });

  it("should create layer-based chunks with dependencies", () => {
    const files = [
      "src/components/App.tsx",
      "src/api/users.ts",
      "prisma/schema.prisma",
    ];
    const chunks = decomposeTask("Build feature", files, "layer");
    
    const dbChunk = chunks.find(c => c.id === "database");
    const backendChunk = chunks.find(c => c.id === "backend");
    const frontendChunk = chunks.find(c => c.id === "frontend");
    
    expect(dbChunk?.dependsOn).toEqual([]);
    expect(backendChunk?.dependsOn).toContain("database");
    expect(frontendChunk?.dependsOn).toContain("backend");
  });

  it("should handle frontend-only files", () => {
    const files = ["src/components/Button.tsx", "src/styles/main.css"];
    const chunks = decomposeTask("Build UI", files, "layer");
    
    const frontendChunk = chunks.find(c => c.id === "frontend");
    expect(frontendChunk).toBeDefined();
    expect(frontendChunk?.files).toHaveLength(2);
  });

  it("should handle backend-only files", () => {
    const files = ["src/api/users.ts", "src/server/middleware.ts"];
    const chunks = decomposeTask("Build API", files, "layer");
    
    const backendChunk = chunks.find(c => c.id === "backend");
    expect(backendChunk).toBeDefined();
    expect(backendChunk?.files).toHaveLength(2);
  });

  it("should handle test files separately", () => {
    const files = [
      "src/app.ts",
      "src/app.test.ts",
      "e2e/login.spec.ts",
    ];
    const chunks = decomposeTask("Build feature", files, "layer");
    
    const testChunk = chunks.find(c => c.id === "tests");
    expect(testChunk).toBeDefined();
    expect(testChunk?.files).toContain("src/app.test.ts");
    expect(testChunk?.files).toContain("e2e/login.spec.ts");
  });

  it("should make tests depend on frontend and backend", () => {
    const files = [
      "src/app.tsx",
      "src/api/users.ts",
      "src/app.test.ts",
    ];
    const chunks = decomposeTask("Build feature", files, "layer");
    
    const testChunk = chunks.find(c => c.id === "tests");
    expect(testChunk?.dependsOn).toContain("frontend");
    expect(testChunk?.dependsOn).toContain("backend");
  });

  it("should handle convex schema files as database", () => {
    const files = ["convex/schema.ts", "src/app.tsx"];
    const chunks = decomposeTask("Build feature", files, "layer");
    
    const dbChunk = chunks.find(c => c.id === "database");
    expect(dbChunk).toBeDefined();
    expect(dbChunk?.files).toContain("convex/schema.ts");
  });

  it("should categorize config files correctly", () => {
    const files = [
      "next.config.js",
      ".env.local",
      "src/app.tsx",
    ];
    const chunks = decomposeTask("Setup project", files, "layer");
    
    // Config files should not be in frontend
    const frontendChunk = chunks.find(c => c.id === "frontend");
    expect(frontendChunk?.files).not.toContain("next.config.js");
  });

  it("should split large groups in max strategy", () => {
    const files = [
      "src/comp1.tsx",
      "src/comp2.tsx",
      "src/comp3.tsx",
      "src/comp4.tsx",
      "src/comp5.tsx",
    ];
    const chunks = decomposeTask("Build components", files, "max");
    
    // Should split into multiple chunks for max parallelism
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it("should not split small groups in max strategy", () => {
    const files = ["src/app.tsx", "src/main.tsx"];
    const chunks = decomposeTask("Build app", files, "max");
    
    // Small groups should stay together
    const hasMultiPartFrontend = chunks.some(c => c.id.includes("-1")) && 
                                  chunks.some(c => c.id.includes("-2"));
    expect(hasMultiPartFrontend).toBe(false);
  });

  it("should handle feature strategy", () => {
    const files = [
      "src/components/User.tsx",
      "src/api/users.ts",
      "prisma/schema.prisma",
    ];
    const chunks = decomposeTask("User feature", files, "feature");
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => c.status === "pending")).toBe(true);
  });

  it("should handle empty file list", () => {
    const chunks = decomposeTask("Empty task", [], "layer");
    
    // Should return empty array or handle gracefully
    expect(Array.isArray(chunks)).toBe(true);
  });

  it("should assign unique chunk IDs", () => {
    const files = [
      "src/a.tsx",
      "src/b.tsx",
      "src/api/c.ts",
      "src/api/d.ts",
    ];
    const chunks = decomposeTask("Multi-chunk", files, "feature");
    
    const ids = chunks.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should preserve all files across chunks", () => {
    const files = [
      "src/app.tsx",
      "src/api/users.ts",
      "prisma/schema.prisma",
      "src/app.test.ts",
    ];
    const chunks = decomposeTask("Full feature", files, "layer");
    
    const allChunkFiles = chunks.flatMap(c => c.files);
    for (const file of files) {
      expect(allChunkFiles).toContain(file);
    }
  });
});
