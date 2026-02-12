/**
 * Tests for Artifacts module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createArtifact,
  getArtifact,
  getArtifactsByJob,
  getArtifactChain,
  formatArtifactsForPrompt,
  type Artifact,
  type ArtifactType,
} from "../../../src/lib/guardian/artifacts";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockReaddirSync = readdirSync as ReturnType<typeof vi.fn>;

describe("Artifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createArtifact", () => {
    it("should create artifact with generated ID and timestamp", () => {
      const artifact = createArtifact({
        type: "investigation",
        jobId: "job-123",
        createdBy: "agent-1",
        title: "Test Investigation",
        content: "Investigation content",
        metadata: { priority: "high" },
      });

      expect(artifact.id).toMatch(/^artifact-\d+-[a-z0-9]{6}$/);
      expect(artifact.createdAt).toBeTruthy();
      expect(artifact.type).toBe("investigation");
      expect(artifact.jobId).toBe("job-123");
      expect(artifact.createdBy).toBe("agent-1");
      expect(artifact.title).toBe("Test Investigation");
      expect(artifact.content).toBe("Investigation content");
      expect(artifact.metadata).toEqual({ priority: "high" });
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should create artifacts directory if missing", () => {
      mockExistsSync.mockReturnValue(false);
      
      createArtifact({
        type: "plan",
        jobId: "job-123",
        createdBy: "agent-1",
        title: "Test Plan",
        content: "Plan content",
        metadata: {},
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("artifacts"),
        { recursive: true }
      );
    });

    it("should support all artifact types", () => {
      const types: ArtifactType[] = [
        "investigation",
        "plan",
        "code_change",
        "test_results",
        "review",
        "summary",
      ];

      types.forEach((type) => {
        const artifact = createArtifact({
          type,
          jobId: "job-123",
          createdBy: "agent-1",
          title: `Test ${type}`,
          content: "Content",
          metadata: {},
        });

        expect(artifact.type).toBe(type);
      });
    });

    it("should include optional worktreeId", () => {
      const artifact = createArtifact({
        type: "code_change",
        jobId: "job-123",
        worktreeId: "worktree-456",
        createdBy: "agent-1",
        title: "Code Change",
        content: "Changes",
        metadata: {},
      });

      expect(artifact.worktreeId).toBe("worktree-456");
    });

    it("should include optional parentArtifactId", () => {
      const artifact = createArtifact({
        type: "review",
        jobId: "job-123",
        createdBy: "agent-1",
        title: "Review",
        content: "Review content",
        metadata: {},
        parentArtifactId: "artifact-parent-123",
      });

      expect(artifact.parentArtifactId).toBe("artifact-parent-123");
    });

    it("should write artifact as JSON to file", () => {
      const artifact = createArtifact({
        type: "summary",
        jobId: "job-123",
        createdBy: "agent-1",
        title: "Summary",
        content: "Summary content",
        metadata: { status: "complete" },
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${artifact.id}.json`),
        expect.stringContaining(artifact.title)
      );

      const writtenContent = (mockWriteFileSync as any).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);
      expect(parsed.id).toBe(artifact.id);
      expect(parsed.title).toBe("Summary");
    });
  });

  describe("getArtifact", () => {
    it("should return artifact from file", () => {
      const mockArtifact: Artifact = {
        id: "artifact-123",
        type: "investigation",
        jobId: "job-123",
        createdBy: "agent-1",
        createdAt: "2024-01-01T00:00:00.000Z",
        title: "Test Artifact",
        content: "Content",
        metadata: {},
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockArtifact));

      const result = getArtifact("artifact-123");

      expect(result).toEqual(mockArtifact);
      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining("artifact-123.json"),
        "utf-8"
      );
    });

    it("should return null if artifact does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = getArtifact("nonexistent");

      expect(result).toBeNull();
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });
  });

  describe("getArtifactsByJob", () => {
    it("should return artifacts for specific job", () => {
      const artifacts: Artifact[] = [
        {
          id: "artifact-1",
          type: "investigation",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          title: "Artifact 1",
          content: "Content 1",
          metadata: {},
        },
        {
          id: "artifact-2",
          type: "plan",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T01:00:00.000Z",
          title: "Artifact 2",
          content: "Content 2",
          metadata: {},
        },
        {
          id: "artifact-3",
          type: "summary",
          jobId: "job-456",
          createdBy: "agent-2",
          createdAt: "2024-01-01T02:00:00.000Z",
          title: "Artifact 3",
          content: "Content 3",
          metadata: {},
        },
      ];

      mockReaddirSync.mockReturnValue([
        "artifact-1.json",
        "artifact-2.json",
        "artifact-3.json",
      ]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("artifact-1.json")) return JSON.stringify(artifacts[0]);
        if (path.includes("artifact-2.json")) return JSON.stringify(artifacts[1]);
        if (path.includes("artifact-3.json")) return JSON.stringify(artifacts[2]);
        return "{}";
      });

      const result = getArtifactsByJob("job-123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("artifact-1");
      expect(result[1].id).toBe("artifact-2");
    });

    it("should sort artifacts by creation time", () => {
      const artifacts: Artifact[] = [
        {
          id: "artifact-1",
          type: "investigation",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T02:00:00.000Z",
          title: "Latest",
          content: "Content",
          metadata: {},
        },
        {
          id: "artifact-2",
          type: "plan",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          title: "Earliest",
          content: "Content",
          metadata: {},
        },
        {
          id: "artifact-3",
          type: "summary",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T01:00:00.000Z",
          title: "Middle",
          content: "Content",
          metadata: {},
        },
      ];

      mockReaddirSync.mockReturnValue([
        "artifact-1.json",
        "artifact-2.json",
        "artifact-3.json",
      ]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("artifact-1.json")) return JSON.stringify(artifacts[0]);
        if (path.includes("artifact-2.json")) return JSON.stringify(artifacts[1]);
        if (path.includes("artifact-3.json")) return JSON.stringify(artifacts[2]);
        return "{}";
      });

      const result = getArtifactsByJob("job-123");

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("Earliest");
      expect(result[1].title).toBe("Middle");
      expect(result[2].title).toBe("Latest");
    });

    it("should return empty array if no artifacts for job", () => {
      mockReaddirSync.mockReturnValue([]);

      const result = getArtifactsByJob("job-nonexistent");

      expect(result).toEqual([]);
    });

    it("should filter out non-JSON files", () => {
      mockReaddirSync.mockReturnValue([
        "artifact-1.json",
        "readme.txt",
        ".gitkeep",
      ]);

      const artifact: Artifact = {
        id: "artifact-1",
        type: "investigation",
        jobId: "job-123",
        createdBy: "agent-1",
        createdAt: "2024-01-01T00:00:00.000Z",
        title: "Test",
        content: "Content",
        metadata: {},
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(artifact));

      const result = getArtifactsByJob("job-123");

      expect(result).toHaveLength(1);
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("getArtifactChain", () => {
    it("should return chain of artifacts from parent to child", () => {
      const artifacts: Record<string, Artifact> = {
        "artifact-1": {
          id: "artifact-1",
          type: "investigation",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          title: "Root Investigation",
          content: "Content",
          metadata: {},
        },
        "artifact-2": {
          id: "artifact-2",
          type: "plan",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T01:00:00.000Z",
          title: "Implementation Plan",
          content: "Content",
          metadata: {},
          parentArtifactId: "artifact-1",
        },
        "artifact-3": {
          id: "artifact-3",
          type: "code_change",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T02:00:00.000Z",
          title: "Code Changes",
          content: "Content",
          metadata: {},
          parentArtifactId: "artifact-2",
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("artifact-1.json")) return JSON.stringify(artifacts["artifact-1"]);
        if (path.includes("artifact-2.json")) return JSON.stringify(artifacts["artifact-2"]);
        if (path.includes("artifact-3.json")) return JSON.stringify(artifacts["artifact-3"]);
        return "{}";
      });

      const result = getArtifactChain("artifact-3");

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("artifact-1");
      expect(result[1].id).toBe("artifact-2");
      expect(result[2].id).toBe("artifact-3");
    });

    it("should return single artifact if no parent", () => {
      const artifact: Artifact = {
        id: "artifact-1",
        type: "investigation",
        jobId: "job-123",
        createdBy: "agent-1",
        createdAt: "2024-01-01T00:00:00.000Z",
        title: "Standalone",
        content: "Content",
        metadata: {},
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(artifact));

      const result = getArtifactChain("artifact-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("artifact-1");
    });

    it("should return empty array if artifact not found", () => {
      mockExistsSync.mockReturnValue(false);

      const result = getArtifactChain("nonexistent");

      expect(result).toEqual([]);
    });

    it("should handle broken chain gracefully", () => {
      const artifact: Artifact = {
        id: "artifact-2",
        type: "plan",
        jobId: "job-123",
        createdBy: "agent-1",
        createdAt: "2024-01-01T01:00:00.000Z",
        title: "Orphaned Plan",
        content: "Content",
        metadata: {},
        parentArtifactId: "artifact-missing",
      };

      mockExistsSync.mockImplementation((path: any) => {
        return path.includes("artifact-2.json");
      });

      mockReadFileSync.mockReturnValue(JSON.stringify(artifact));

      const result = getArtifactChain("artifact-2");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("artifact-2");
    });
  });

  describe("formatArtifactsForPrompt", () => {
    it("should format artifacts as markdown", () => {
      const artifacts: Artifact[] = [
        {
          id: "artifact-1",
          type: "investigation",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          title: "Bug Investigation",
          content: "Found the issue in login.ts",
          metadata: {},
        },
        {
          id: "artifact-2",
          type: "plan",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T01:00:00.000Z",
          title: "Fix Plan",
          content: "1. Update validation\n2. Add tests",
          metadata: {},
        },
      ];

      const result = formatArtifactsForPrompt(artifacts);

      expect(result).toContain("## Artifact: Bug Investigation");
      expect(result).toContain("**Type:** investigation");
      expect(result).toContain("**Created by:** agent-1");
      expect(result).toContain("**Time:** 2024-01-01T00:00:00.000Z");
      expect(result).toContain("Found the issue in login.ts");
      expect(result).toContain("## Artifact: Fix Plan");
      expect(result).toContain("1. Update validation");
      expect(result).toContain("---");
    });

    it("should return empty string for empty array", () => {
      const result = formatArtifactsForPrompt([]);
      expect(result).toBe("");
    });

    it("should format single artifact without separator", () => {
      const artifacts: Artifact[] = [
        {
          id: "artifact-1",
          type: "summary",
          jobId: "job-123",
          createdBy: "agent-1",
          createdAt: "2024-01-01T00:00:00.000Z",
          title: "Summary",
          content: "All done!",
          metadata: {},
        },
      ];

      const result = formatArtifactsForPrompt(artifacts);

      expect(result).toContain("## Artifact: Summary");
      expect(result).toContain("All done!");
      expect(result.split("---")).toHaveLength(1);
    });
  });
});
