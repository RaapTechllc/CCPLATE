/**
 * Tests for Smart Handoff module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeNextTask,
  gatherContextItems,
  compressContext,
  hashFullContext,
  saveFullContext,
  loadFullContext,
  createSmartHandoff,
  loadSmartHandoff,
  formatContextForPrompt,
  formatSmartHandoff,
  DEFAULT_HANDOFF_CONFIG,
  type ContextItem,
  type CompressedContext,
  type HandoffConfig,
} from "../../../src/lib/guardian/smart-handoff";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock handoff
vi.mock("../../../src/lib/guardian/handoff", () => ({
  loadHandoff: vi.fn(() => null),
}));

// Mock error-recovery
vi.mock("../../../src/lib/guardian/error-recovery", () => ({
  loadPatternDB: vi.fn(() => ({
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    patterns: [],
    recentAttempts: [],
  })),
}));

// Mock ralph-engine
vi.mock("../../../src/lib/guardian/ralph-engine", () => ({
  loadEvents: vi.fn(() => []),
}));

import { existsSync, readFileSync, writeFileSync } from "fs";
import { loadHandoff } from "../../../src/lib/guardian/handoff";
import { loadPatternDB } from "../../../src/lib/guardian/error-recovery";
import { loadEvents } from "../../../src/lib/guardian/ralph-engine";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockLoadHandoff = loadHandoff as ReturnType<typeof vi.fn>;
const mockLoadPatternDB = loadPatternDB as ReturnType<typeof vi.fn>;
const mockLoadEvents = loadEvents as ReturnType<typeof vi.fn>;

describe("Smart Handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("analyzeNextTask", () => {
    it("should extract keywords from task description", () => {
      const result = analyzeNextTask(
        "/test",
        "task-1",
        "Implement user authentication with JWT tokens"
      );

      expect(result.taskId).toBe("task-1");
      expect(result.taskDescription).toBe("Implement user authentication with JWT tokens");
      expect(result.keywords).toContain("implement");
      expect(result.keywords).toContain("user");
      expect(result.keywords).toContain("authentication");
    });

    it("should assess complexity correctly", () => {
      const simpleTask = analyzeNextTask("/test", "t1", "Change button color");
      const moderateTask = analyzeNextTask("/test", "t2", "Add new API endpoint");
      const complexTask = analyzeNextTask("/test", "t3", "Refactor authentication architecture");

      expect(simpleTask.estimatedComplexity).toBe("simple");
      expect(moderateTask.estimatedComplexity).toBe("moderate");
      expect(complexTask.estimatedComplexity).toBe("complex");
    });

    it("should infer required context types", () => {
      const result = analyzeNextTask(
        "/test",
        "task-1",
        "Fix failing tests for auth module"
      );

      expect(result.requiredContext).toContain("test_result");
      expect(result.requiredContext).toContain("blocker");
      expect(result.requiredContext).toContain("decision");
    });

    it("should find related error patterns", () => {
      mockLoadPatternDB.mockReturnValue({
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        patterns: [
          { id: "auth-error", name: "Auth Error", description: "Authentication failed", contextHints: ["jwt", "token"] },
          { id: "type-error", name: "Type Error", description: "TypeScript error", contextHints: ["type"] },
        ],
        recentAttempts: [],
      });

      const result = analyzeNextTask(
        "/test",
        "task-1",
        "Fix authentication JWT token error"
      );

      expect(result.relatedPatterns).toContain("auth-error");
    });
  });

  describe("compressContext", () => {
    it("should filter by included types", () => {
      const items: ContextItem[] = [
        { id: "1", type: "decision", priority: "high", content: "Decision 1", tokens: 10, relevanceScore: 0.8, source: "test" },
        { id: "2", type: "warning", priority: "low", content: "Warning 1", tokens: 10, relevanceScore: 0.2, source: "test" },
      ];

      const config: HandoffConfig = {
        ...DEFAULT_HANDOFF_CONFIG,
        includeTypes: ["decision"],
      };

      const result = compressContext(items, config);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("decision");
    });

    it("should respect token budget", () => {
      const items: ContextItem[] = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        type: "decision" as const,
        priority: "high" as const,
        content: "A".repeat(100), // ~25 tokens each
        tokens: 25,
        relevanceScore: 0.9 - i * 0.01,
        source: "test",
      }));

      const config: HandoffConfig = {
        ...DEFAULT_HANDOFF_CONFIG,
        tokenBudget: 100,
        maxItemsPerType: 20,
      };

      const result = compressContext(items, config);
      const totalTokens = result.reduce((sum, i) => sum + i.tokens, 0);

      expect(totalTokens).toBeLessThanOrEqual(100);
    });

    it("should prioritize by score", () => {
      const items: ContextItem[] = [
        { id: "1", type: "decision", priority: "low", content: "Low", tokens: 10, relevanceScore: 0.2, source: "test" },
        { id: "2", type: "decision", priority: "critical", content: "Critical", tokens: 10, relevanceScore: 0.9, source: "test" },
        { id: "3", type: "decision", priority: "high", content: "High", tokens: 10, relevanceScore: 0.7, source: "test" },
      ];

      const result = compressContext(items);

      // Critical should come first due to higher priority weight
      expect(result[0].priority).toBe("critical");
    });

    it("should filter by excluded patterns", () => {
      const items: ContextItem[] = [
        { id: "1", type: "decision", priority: "high", content: "Keep this", tokens: 10, relevanceScore: 0.8, source: "test" },
        { id: "2", type: "decision", priority: "high", content: "node_modules/package", tokens: 10, relevanceScore: 0.8, source: "test" },
      ];

      const result = compressContext(items);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Keep this");
    });

    it("should respect max items per type", () => {
      const items: ContextItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        type: "decision" as const,
        priority: "high" as const,
        content: `Decision ${i}`,
        tokens: 10,
        relevanceScore: 0.9,
        source: "test",
      }));

      const config: HandoffConfig = {
        ...DEFAULT_HANDOFF_CONFIG,
        maxItemsPerType: 3,
      };

      const result = compressContext(items, config);

      expect(result).toHaveLength(3);
    });
  });

  describe("hashFullContext", () => {
    it("should generate consistent hash for same content", () => {
      const items: ContextItem[] = [
        { id: "1", type: "decision", priority: "high", content: "Decision 1", tokens: 10, relevanceScore: 0.8, source: "test" },
      ];

      const hash1 = hashFullContext(items);
      const hash2 = hashFullContext(items);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it("should generate different hash for different content", () => {
      const items1: ContextItem[] = [
        { id: "1", type: "decision", priority: "high", content: "Decision 1", tokens: 10, relevanceScore: 0.8, source: "test" },
      ];
      const items2: ContextItem[] = [
        { id: "2", type: "decision", priority: "high", content: "Decision 2", tokens: 10, relevanceScore: 0.8, source: "test" },
      ];

      const hash1 = hashFullContext(items1);
      const hash2 = hashFullContext(items2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("saveFullContext / loadFullContext", () => {
    it("should save full context to file", () => {
      const items: ContextItem[] = [
        { id: "1", type: "decision", priority: "high", content: "Decision 1", tokens: 10, relevanceScore: 0.8, source: "test" },
      ];

      saveFullContext("/test", items, "abc123");

      expect(mockWriteFileSync).toHaveBeenCalled();
      const call = mockWriteFileSync.mock.calls[0];
      expect(call[0]).toContain("context-abc123.json");
    });

    it("should load full context from file", () => {
      const items: ContextItem[] = [
        { id: "1", type: "decision", priority: "high", content: "Decision 1", tokens: 10, relevanceScore: 0.8, source: "test" },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(items));

      const result = loadFullContext("/test", "abc123");

      expect(result).toEqual(items);
    });

    it("should return null if file doesn't exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadFullContext("/test", "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createSmartHandoff", () => {
    it("should create smart handoff with correct structure", () => {
      const result = createSmartHandoff(
        "/test",
        "task-1",
        "Implement user authentication"
      );

      expect(result.success).toBe(true);
      expect(result.compressed).toHaveProperty("id");
      expect(result.compressed).toHaveProperty("timestamp");
      expect(result.compressed).toHaveProperty("taskAnalysis");
      expect(result.compressed).toHaveProperty("items");
      expect(result.compressed).toHaveProperty("fullContextHash");
    });

    it("should include task analysis", () => {
      const result = createSmartHandoff(
        "/test",
        "task-1",
        "Refactor database migrations"
      );

      expect(result.compressed.taskAnalysis.taskId).toBe("task-1");
      expect(result.compressed.taskAnalysis.taskDescription).toBe("Refactor database migrations");
      expect(result.compressed.taskAnalysis.estimatedComplexity).toBe("complex");
    });

    it("should save files", () => {
      createSmartHandoff("/test", "task-1", "Test task");

      // Should save at least the smart handoff JSON and MD
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should include metadata", () => {
      const result = createSmartHandoff("/test", "task-1", "Test task");

      expect(result.compressed.metadata).toHaveProperty("version");
      expect(result.compressed.metadata).toHaveProperty("compressionRatio");
      expect(result.compressed.metadata).toHaveProperty("priorityBreakdown");
    });
  });

  describe("loadSmartHandoff", () => {
    it("should return null if no handoff exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadSmartHandoff("/test");

      expect(result).toBeNull();
    });

    it("should load existing handoff", () => {
      const mockHandoff: CompressedContext = {
        id: "sh-123",
        timestamp: new Date().toISOString(),
        taskAnalysis: {
          taskId: "task-1",
          taskDescription: "Test task",
          relatedFiles: [],
          relatedPatterns: [],
          requiredContext: ["decision"],
          estimatedComplexity: "simple",
          keywords: ["test"],
        },
        items: [],
        totalTokens: 0,
        budgetUsed: 0,
        fullContextHash: "abc123",
        truncatedCount: 0,
        metadata: {
          version: "1.0.0",
          compressionRatio: 1,
          priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockHandoff));

      const result = loadSmartHandoff("/test");

      expect(result).toEqual(mockHandoff);
    });
  });

  describe("formatContextForPrompt", () => {
    it("should format context for prompt injection", () => {
      const context: CompressedContext = {
        id: "sh-123",
        timestamp: new Date().toISOString(),
        taskAnalysis: {
          taskId: "task-1",
          taskDescription: "Implement auth",
          relatedFiles: ["src/auth.ts"],
          relatedPatterns: [],
          requiredContext: ["decision"],
          estimatedComplexity: "moderate",
          keywords: ["auth"],
        },
        items: [
          { id: "1", type: "decision", priority: "high", content: "Use JWT tokens", tokens: 10, relevanceScore: 0.9, source: "test" },
          { id: "2", type: "blocker", priority: "critical", content: "Fix env vars", tokens: 10, relevanceScore: 0.8, source: "test" },
        ],
        totalTokens: 20,
        budgetUsed: 0.01,
        fullContextHash: "abc123",
        truncatedCount: 0,
        metadata: {
          version: "1.0.0",
          compressionRatio: 1,
          priorityBreakdown: { critical: 1, high: 1, medium: 0, low: 0 },
        },
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain("Session Context");
      expect(result).toContain("Implement auth");
      expect(result).toContain("Use JWT tokens");
      expect(result).toContain("Fix env vars");
      expect(result).toContain("abc123");
    });

    it("should group items by type", () => {
      const context: CompressedContext = {
        id: "sh-123",
        timestamp: new Date().toISOString(),
        taskAnalysis: {
          taskId: "task-1",
          taskDescription: "Test",
          relatedFiles: [],
          relatedPatterns: [],
          requiredContext: [],
          estimatedComplexity: "simple",
          keywords: [],
        },
        items: [
          { id: "1", type: "decision", priority: "high", content: "Decision 1", tokens: 10, relevanceScore: 0.9, source: "test" },
          { id: "2", type: "decision", priority: "medium", content: "Decision 2", tokens: 10, relevanceScore: 0.7, source: "test" },
          { id: "3", type: "blocker", priority: "critical", content: "Blocker 1", tokens: 10, relevanceScore: 0.8, source: "test" },
        ],
        totalTokens: 30,
        budgetUsed: 0.01,
        fullContextHash: "abc123",
        truncatedCount: 0,
        metadata: {
          version: "1.0.0",
          compressionRatio: 1,
          priorityBreakdown: { critical: 1, high: 1, medium: 1, low: 0 },
        },
      };

      const result = formatContextForPrompt(context);

      expect(result).toContain("Decisions");
      expect(result).toContain("Blockers");
    });
  });

  describe("formatSmartHandoff", () => {
    it("should format for CLI display", () => {
      const context: CompressedContext = {
        id: "sh-123",
        timestamp: new Date().toISOString(),
        taskAnalysis: {
          taskId: "task-1",
          taskDescription: "Test task",
          relatedFiles: [],
          relatedPatterns: [],
          requiredContext: [],
          estimatedComplexity: "simple",
          keywords: [],
        },
        items: [
          { id: "1", type: "decision", priority: "high", content: "Decision", tokens: 10, relevanceScore: 0.9, source: "test" },
        ],
        totalTokens: 10,
        budgetUsed: 0.0025,
        fullContextHash: "abc123",
        truncatedCount: 5,
        metadata: {
          version: "1.0.0",
          compressionRatio: 0.5,
          priorityBreakdown: { critical: 0, high: 1, medium: 0, low: 0 },
        },
      };

      const result = formatSmartHandoff(context);

      expect(result).toContain("Smart Handoff");
      expect(result).toContain("Test task");
      expect(result).toContain("simple");
      expect(result).toContain("10");
      expect(result).toContain("5 truncated");
      expect(result).toContain("abc123");
    });
  });

  describe("gatherContextItems", () => {
    it("should gather from handoff state", () => {
      mockLoadHandoff.mockReturnValue({
        metadata: { createdAt: new Date().toISOString(), reason: "manual", contextPressure: 0.5 },
        currentTask: null,
        recentDecisions: [
          { description: "Use React for frontend", timestamp: new Date().toISOString() },
        ],
        criticalFiles: [],
        nextActions: ["Fix auth error"],
      });

      const analysis = {
        taskId: "task-1",
        taskDescription: "Continue auth work",
        relatedFiles: [],
        relatedPatterns: [],
        requiredContext: ["decision" as const],
        estimatedComplexity: "moderate" as const,
        keywords: ["auth", "react"],
      };

      const items = gatherContextItems("/test", analysis);

      expect(items.some(i => i.type === "decision")).toBe(true);
      expect(items.some(i => i.type === "blocker")).toBe(true);
    });

    it("should gather from error patterns", () => {
      mockLoadPatternDB.mockReturnValue({
        version: "1.0.0",
        lastUpdated: new Date().toISOString(),
        patterns: [
          {
            id: "auth-error",
            name: "Auth Error",
            description: "Authentication failed",
            contextHints: ["auth"],
            occurrences: 5,
            strategies: [
              { id: "s1", description: "Check token", attempts: 10, successes: 8, partials: 1, failures: 1, avgFixTimeMs: 1000 },
            ],
            examples: [],
            category: "auth",
            regex: "auth.*failed",
            regexFlags: "i",
            confidence: 0.9,
          },
        ],
        recentAttempts: [],
      });

      const analysis = {
        taskId: "task-1",
        taskDescription: "Fix auth",
        relatedFiles: [],
        relatedPatterns: ["auth-error"],
        requiredContext: ["error_pattern" as const],
        estimatedComplexity: "moderate" as const,
        keywords: ["auth"],
      };

      const items = gatherContextItems("/test", analysis);

      expect(items.some(i => i.type === "error_pattern")).toBe(true);
    });

    it("should gather from workflow events", () => {
      mockLoadEvents.mockReturnValue([
        {
          id: "evt-1",
          type: "TASK_FAILED",
          timestamp: new Date().toISOString(),
          taskId: "task-1",
          payload: { error: "Build failed" },
        },
        {
          id: "evt-2",
          type: "TEST_RESULT",
          timestamp: new Date().toISOString(),
          payload: { message: "3 tests passed" },
        },
      ]);

      const analysis = {
        taskId: "task-1",
        taskDescription: "Fix build",
        relatedFiles: [],
        relatedPatterns: [],
        requiredContext: ["task_status" as const],
        estimatedComplexity: "moderate" as const,
        keywords: ["build", "test"],
      };

      const items = gatherContextItems("/test", analysis);

      expect(items.some(i => i.type === "task_status" || i.type === "test_result")).toBe(true);
    });

    it("should gather from workflow state", () => {
      mockExistsSync.mockImplementation((path: string) => {
        if (typeof path === "string" && path.includes("workflow-state.json")) return true;
        return false;
      });
      mockReadFileSync.mockImplementation((path: string) => {
        if (typeof path === "string" && path.includes("workflow-state.json")) {
          return JSON.stringify({
            current_phase: "setup",
            phase_progress: 50,
            errors_detected: ["Missing env var"],
          });
        }
        return "";
      });

      const analysis = {
        taskId: "task-1",
        taskDescription: "Continue setup",
        relatedFiles: [],
        relatedPatterns: [],
        requiredContext: ["phase_info" as const],
        estimatedComplexity: "simple" as const,
        keywords: ["setup"],
      };

      const items = gatherContextItems("/test", analysis);

      expect(items.some(i => i.type === "phase_info")).toBe(true);
      expect(items.some(i => i.type === "blocker")).toBe(true);
    });
  });

  describe("DEFAULT_HANDOFF_CONFIG", () => {
    it("should have reasonable defaults", () => {
      expect(DEFAULT_HANDOFF_CONFIG.tokenBudget).toBeGreaterThan(0);
      expect(DEFAULT_HANDOFF_CONFIG.minItemsPerType).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_HANDOFF_CONFIG.maxItemsPerType).toBeGreaterThan(DEFAULT_HANDOFF_CONFIG.minItemsPerType);
      expect(DEFAULT_HANDOFF_CONFIG.includeTypes.length).toBeGreaterThan(0);
    });

    it("should have priority weights for all priorities", () => {
      expect(DEFAULT_HANDOFF_CONFIG.priorityWeights).toHaveProperty("critical");
      expect(DEFAULT_HANDOFF_CONFIG.priorityWeights).toHaveProperty("high");
      expect(DEFAULT_HANDOFF_CONFIG.priorityWeights).toHaveProperty("medium");
      expect(DEFAULT_HANDOFF_CONFIG.priorityWeights).toHaveProperty("low");
    });
  });
});
