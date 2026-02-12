/**
 * Tests for Knowledge Mesh module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  broadcast,
  getKnowledge,
  formatKnowledgeForPrompt,
  getKnowledgeForFiles,
  getNewKnowledgeSince,
  getHighPriorityKnowledge,
  type KnowledgeEntry,
  type KnowledgeType,
} from "../../../src/lib/guardian/knowledge-mesh";

// Mock fs
vi.mock("fs", () => ({
  appendFileSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { appendFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const mockAppendFileSync = appendFileSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;

describe("Knowledge Mesh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("broadcast", () => {
    it("should create knowledge entry with generated ID and timestamp", () => {
      const entry = broadcast({
        worktreeId: "worktree-1",
        agentName: "agent-1",
        type: "discovery",
        title: "Found bug",
        content: "Authentication issue in login.ts",
        priority: "high",
      });

      expect(entry.id).toMatch(/^k-\d+-[a-z0-9]{4}$/);
      expect(entry.timestamp).toBeTruthy();
      expect(entry.worktreeId).toBe("worktree-1");
      expect(entry.agentName).toBe("agent-1");
      expect(entry.type).toBe("discovery");
      expect(entry.title).toBe("Found bug");
      expect(entry.content).toContain("Authentication issue");
      expect(entry.priority).toBe("high");
    });

    it("should create memory directory if missing", () => {
      mockExistsSync.mockReturnValue(false);

      broadcast({
        worktreeId: "worktree-1",
        agentName: "agent-1",
        type: "warning",
        title: "Test",
        content: "Content",
        priority: "medium",
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should append to knowledge file as JSONL", () => {
      const entry = broadcast({
        worktreeId: "worktree-1",
        agentName: "agent-1",
        type: "pattern",
        title: "Use React Query",
        content: "All API calls should use React Query",
        priority: "medium",
      });

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("session-knowledge.jsonl"),
        expect.stringContaining(entry.id)
      );

      const written = (mockAppendFileSync as any).mock.calls[0][1];
      expect(written).toContain("worktree-1");
      expect(written).toContain("Use React Query");
      expect(written).toMatch(/\n$/); // Ends with newline
    });

    it("should support all knowledge types", () => {
      const types: KnowledgeType[] = [
        "discovery",
        "warning",
        "pattern",
        "dependency",
        "blocker",
        "resolution",
      ];

      types.forEach((type) => {
        vi.clearAllMocks();
        const entry = broadcast({
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type,
          title: `Test ${type}`,
          content: "Content",
          priority: "low",
        });

        expect(entry.type).toBe(type);
      });
    });

    it("should support all priority levels", () => {
      const priorities: Array<KnowledgeEntry["priority"]> = [
        "low",
        "medium",
        "high",
        "critical",
      ];

      priorities.forEach((priority) => {
        const entry = broadcast({
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Test",
          content: "Content",
          priority,
        });

        expect(entry.priority).toBe(priority);
      });
    });

    it("should include optional relatedFiles", () => {
      const entry = broadcast({
        worktreeId: "worktree-1",
        agentName: "agent-1",
        type: "discovery",
        title: "Bug in auth",
        content: "Issue found",
        relatedFiles: ["src/auth/login.ts", "src/auth/session.ts"],
        priority: "high",
      });

      expect(entry.relatedFiles).toEqual([
        "src/auth/login.ts",
        "src/auth/session.ts",
      ]);
    });

    it("should include optional tags", () => {
      const entry = broadcast({
        worktreeId: "worktree-1",
        agentName: "agent-1",
        type: "pattern",
        title: "Naming convention",
        content: "Use camelCase",
        tags: ["style", "conventions", "best-practice"],
        priority: "low",
      });

      expect(entry.tags).toEqual(["style", "conventions", "best-practice"]);
    });
  });

  describe("getKnowledge", () => {
    it("should return empty array when no knowledge file exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = getKnowledge();

      expect(result).toEqual([]);
    });

    it("should return all knowledge entries", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Entry 1",
          content: "Content 1",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "warning",
          title: "Entry 2",
          content: "Content 2",
          priority: "medium",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledge();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("k-1-abc");
      expect(result[1].id).toBe("k-2-def");
    });

    it("should filter by since date", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Old",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-02T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "warning",
          title: "New",
          content: "Content",
          priority: "medium",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledge({
        since: new Date("2024-01-01T12:00:00.000Z"),
      });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("New");
    });

    it("should filter by excludeWorktree", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "From 1",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "warning",
          title: "From 2",
          content: "Content",
          priority: "medium",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledge({
        excludeWorktree: "worktree-1",
      });

      expect(result).toHaveLength(1);
      expect(result[0].worktreeId).toBe("worktree-2");
    });

    it("should filter by types", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Discovery",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "warning",
          title: "Warning",
          content: "Content",
          priority: "medium",
        },
        {
          id: "k-3-ghi",
          timestamp: "2024-01-01T02:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "pattern",
          title: "Pattern",
          content: "Content",
          priority: "low",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledge({
        types: ["discovery", "warning"],
      });

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("discovery");
      expect(result[1].type).toBe("warning");
    });

    it("should filter by minPriority", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Low",
          content: "Content",
          priority: "low",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "warning",
          title: "Medium",
          content: "Content",
          priority: "medium",
        },
        {
          id: "k-3-ghi",
          timestamp: "2024-01-01T02:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "blocker",
          title: "High",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-4-jkl",
          timestamp: "2024-01-01T03:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "blocker",
          title: "Critical",
          content: "Content",
          priority: "critical",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledge({
        minPriority: "high",
      });

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe("high");
      expect(result[1].priority).toBe("critical");
    });

    it("should combine multiple filters", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Match",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-02T00:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "discovery",
          title: "Match",
          content: "Content",
          priority: "low",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledge({
        since: new Date("2023-01-01T00:00:00.000Z"),
        excludeWorktree: "worktree-2",
        types: ["discovery"],
        minPriority: "high",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("k-1-abc");
    });

    it("should handle empty JSONL file", () => {
      mockReadFileSync.mockReturnValue("");

      const result = getKnowledge();

      expect(result).toEqual([]);
    });
  });

  describe("formatKnowledgeForPrompt", () => {
    it("should return empty string for empty array", () => {
      const result = formatKnowledgeForPrompt([]);
      expect(result).toBe("");
    });

    it("should format knowledge entries grouped by type", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Found bug",
          content: "Auth issue in login.ts",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "warning",
          title: "Avoid X",
          content: "Don't use deprecated API",
          priority: "medium",
        },
      ];

      const result = formatKnowledgeForPrompt(entries);

      expect(result).toContain("## 🧠 Knowledge Mesh");
      expect(result).toContain("### DISCOVERY");
      expect(result).toContain("**Found bug** (from worktree-1)");
      expect(result).toContain("Auth issue in login.ts");
      expect(result).toContain("### WARNING");
      expect(result).toContain("**Avoid X** (from worktree-2)");
      expect(result).toContain("Don't use deprecated API");
    });

    it("should group multiple entries of same type", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "pattern",
          title: "Pattern 1",
          content: "Use hooks",
          priority: "medium",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "pattern",
          title: "Pattern 2",
          content: "Use TypeScript",
          priority: "low",
        },
      ];

      const result = formatKnowledgeForPrompt(entries);

      expect(result).toContain("### PATTERN");
      expect(result).toContain("Pattern 1");
      expect(result).toContain("Pattern 2");
    });
  });

  describe("getKnowledgeForFiles", () => {
    it("should return knowledge related to specified files", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Bug in auth",
          content: "Issue found",
          relatedFiles: ["src/auth/login.ts"],
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "warning",
          title: "Other issue",
          content: "Different file",
          relatedFiles: ["src/utils/helper.ts"],
          priority: "medium",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledgeForFiles(["src/auth/login.ts"]);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Bug in auth");
    });

    it("should match partial file paths", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Found issue",
          content: "Content",
          relatedFiles: ["auth/login.ts"],
          priority: "high",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledgeForFiles(["src/auth/login.ts"]);

      expect(result).toHaveLength(1);
    });

    it("should return empty array when no matches", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Found issue",
          content: "Content",
          relatedFiles: ["other/file.ts"],
          priority: "high",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledgeForFiles(["src/auth/login.ts"]);

      expect(result).toEqual([]);
    });

    it("should handle entries without relatedFiles", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Found issue",
          content: "Content",
          priority: "high",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getKnowledgeForFiles(["src/auth/login.ts"]);

      expect(result).toEqual([]);
    });
  });

  describe("getNewKnowledgeSince", () => {
    it("should return medium+ priority knowledge since timestamp", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Old",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-02T00:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "warning",
          title: "New but low",
          content: "Content",
          priority: "low",
        },
        {
          id: "k-3-ghi",
          timestamp: "2024-01-03T00:00:00.000Z",
          worktreeId: "worktree-3",
          agentName: "agent-3",
          type: "blocker",
          title: "New and medium",
          content: "Content",
          priority: "medium",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getNewKnowledgeSince(new Date("2024-01-01T12:00:00.000Z"));

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("New and medium");
    });

    it("should exclude specified worktree", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-02T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "From 1",
          content: "Content",
          priority: "medium",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-03T00:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "warning",
          title: "From 2",
          content: "Content",
          priority: "high",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getNewKnowledgeSince(
        new Date("2024-01-01T00:00:00.000Z"),
        "worktree-1"
      );

      expect(result).toHaveLength(1);
      expect(result[0].worktreeId).toBe("worktree-2");
    });
  });

  describe("getHighPriorityKnowledge", () => {
    it("should return high and critical priority knowledge", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "discovery",
          title: "Low",
          content: "Content",
          priority: "low",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "warning",
          title: "Medium",
          content: "Content",
          priority: "medium",
        },
        {
          id: "k-3-ghi",
          timestamp: "2024-01-01T02:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "blocker",
          title: "High",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-4-jkl",
          timestamp: "2024-01-01T03:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "blocker",
          title: "Critical",
          content: "Content",
          priority: "critical",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getHighPriorityKnowledge();

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBe("high");
      expect(result[1].priority).toBe("critical");
    });

    it("should exclude specified worktree", () => {
      const entries: KnowledgeEntry[] = [
        {
          id: "k-1-abc",
          timestamp: "2024-01-01T00:00:00.000Z",
          worktreeId: "worktree-1",
          agentName: "agent-1",
          type: "blocker",
          title: "From 1",
          content: "Content",
          priority: "high",
        },
        {
          id: "k-2-def",
          timestamp: "2024-01-01T01:00:00.000Z",
          worktreeId: "worktree-2",
          agentName: "agent-2",
          type: "blocker",
          title: "From 2",
          content: "Content",
          priority: "critical",
        },
      ];

      mockReadFileSync.mockReturnValue(
        entries.map((e) => JSON.stringify(e)).join("\n")
      );

      const result = getHighPriorityKnowledge("worktree-1");

      expect(result).toHaveLength(1);
      expect(result[0].worktreeId).toBe("worktree-2");
    });
  });
});
