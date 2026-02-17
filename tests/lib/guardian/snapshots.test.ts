/**
 * Tests for Snapshots module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  rollbackToStep,
  formatSnapshotsForDisplay,
  type Snapshot,
} from "../../../src/lib/guardian/snapshots";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from "fs";
import { execSync } from "child_process";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockReaddirSync = readdirSync as ReturnType<typeof vi.fn>;
const mockCopyFileSync = copyFileSync as ReturnType<typeof vi.fn>;
const mockExecSync = execSync as ReturnType<typeof vi.fn>;

describe("Snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockExecSync.mockReturnValue("abc123\n");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSnapshot", () => {
    it("should create snapshot with git info", () => {
      mockExecSync
        .mockReturnValueOnce("abc123def456\n") // git rev-parse HEAD
        .mockReturnValueOnce("main\n"); // git branch --show-current
      
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const snapshot = createSnapshot({
        description: "Test snapshot",
        validationPassed: true,
      });

      expect(snapshot.id).toMatch(/^snapshot-1-\d+$/);
      expect(snapshot.step).toBe(1);
      expect(snapshot.gitCommit).toBe("abc123def456");
      expect(snapshot.gitBranch).toBe("main");
      expect(snapshot.description).toBe("Test snapshot");
      expect(snapshot.validationPassed).toBe(true);
      expect(snapshot.timestamp).toBeTruthy();
    });

    it("should create snapshots directory if missing", () => {
      mockExistsSync.mockReturnValueOnce(false); // SNAPSHOTS_DIR doesn't exist
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);

      createSnapshot({
        description: "Test",
        validationPassed: true,
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("snapshots"),
        { recursive: true }
      );
    });

    it("should include worktreeId when provided", () => {
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const snapshot = createSnapshot({
        description: "Test",
        worktreeId: "worktree-123",
        validationPassed: true,
      });

      expect(snapshot.worktreeId).toBe("worktree-123");
    });

    it("should increment step number for subsequent snapshots", () => {
      const existingSnapshot: Snapshot = {
        id: "snapshot-5-1234567890",
        step: 5,
        timestamp: "2024-01-01T00:00:00.000Z",
        gitCommit: "abc123",
        gitBranch: "main",
        description: "Previous",
        validationPassed: true,
        files: {
          workflowState: "",
          activityLog: "",
          guardianState: "",
        },
      };

      mockReaddirSync.mockReturnValue(["snapshot-5-1234567890.json"]);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingSnapshot));
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockExistsSync.mockReturnValue(true);

      const snapshot = createSnapshot({
        description: "New snapshot",
        validationPassed: true,
      });

      expect(snapshot.step).toBe(6);
    });

    it("should copy state files when they exist", () => {
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true); // All files exist

      const snapshot = createSnapshot({
        description: "Test",
        validationPassed: true,
      });

      expect(mockCopyFileSync).toHaveBeenCalledWith(
        expect.stringContaining("workflow-state.json"),
        expect.stringContaining(snapshot.id)
      );
      expect(mockCopyFileSync).toHaveBeenCalledWith(
        expect.stringContaining("ACTIVITY.md"),
        expect.stringContaining(snapshot.id)
      );
      expect(mockCopyFileSync).toHaveBeenCalledWith(
        expect.stringContaining("guardian-state.json"),
        expect.stringContaining(snapshot.id)
      );
    });

    it("should skip copying missing state files", () => {
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);
      
      // First checks for SNAPSHOTS_DIR and MEMORY_DIR, then checks for state files
      let callCount = 0;
      mockExistsSync.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return true; // SNAPSHOTS_DIR and initial checks
        return false; // State files don't exist
      });

      createSnapshot({
        description: "Test",
        validationPassed: true,
      });

      expect(mockCopyFileSync).not.toHaveBeenCalled();
    });

    it("should handle git errors gracefully", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Git not found");
      });
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const snapshot = createSnapshot({
        description: "Test",
        validationPassed: true,
      });

      expect(snapshot.gitCommit).toBe("unknown");
      expect(snapshot.gitBranch).toBe("unknown");
    });

    it("should write snapshot metadata to file", () => {
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const snapshot = createSnapshot({
        description: "Test snapshot",
        validationPassed: true,
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${snapshot.id}.json`),
        expect.stringContaining("Test snapshot")
      );

      const writtenContent = (mockWriteFileSync as any).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);
      expect(parsed.id).toBe(snapshot.id);
      expect(parsed.description).toBe("Test snapshot");
    });

    it("should record validation status", () => {
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const failedSnapshot = createSnapshot({
        description: "Failed validation",
        validationPassed: false,
      });

      expect(failedSnapshot.validationPassed).toBe(false);

      vi.clearAllMocks();
      mockExecSync
        .mockReturnValueOnce("abc123\n")
        .mockReturnValueOnce("main\n");
      mockReaddirSync.mockReturnValue([]);
      mockExistsSync.mockReturnValue(true);

      const passedSnapshot = createSnapshot({
        description: "Passed validation",
        validationPassed: true,
      });

      expect(passedSnapshot.validationPassed).toBe(true);
    });
  });

  describe("listSnapshots", () => {
    it("should return empty array when no snapshots exist", () => {
      mockReaddirSync.mockReturnValue([]);

      const result = listSnapshots();

      expect(result).toEqual([]);
    });

    it("should list all snapshots sorted by step", () => {
      const snapshots: Snapshot[] = [
        {
          id: "snapshot-3-123",
          step: 3,
          timestamp: "2024-01-01T02:00:00.000Z",
          gitCommit: "abc123",
          gitBranch: "main",
          description: "Third",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
        {
          id: "snapshot-1-123",
          step: 1,
          timestamp: "2024-01-01T00:00:00.000Z",
          gitCommit: "abc123",
          gitBranch: "main",
          description: "First",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
        {
          id: "snapshot-2-123",
          step: 2,
          timestamp: "2024-01-01T01:00:00.000Z",
          gitCommit: "abc123",
          gitBranch: "main",
          description: "Second",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
      ];

      mockReaddirSync.mockReturnValue([
        "snapshot-3-123.json",
        "snapshot-1-123.json",
        "snapshot-2-123.json",
      ]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("snapshot-1-123.json")) return JSON.stringify(snapshots[1]);
        if (path.includes("snapshot-2-123.json")) return JSON.stringify(snapshots[2]);
        if (path.includes("snapshot-3-123.json")) return JSON.stringify(snapshots[0]);
        return "{}";
      });

      const result = listSnapshots();

      expect(result).toHaveLength(3);
      expect(result[0].step).toBe(1);
      expect(result[1].step).toBe(2);
      expect(result[2].step).toBe(3);
    });

    it("should filter out non-snapshot JSON files", () => {
      mockReaddirSync.mockReturnValue([
        "snapshot-1-123.json",
        "other-file.json",
        "readme.txt",
        ".gitkeep",
      ]);

      const snapshot: Snapshot = {
        id: "snapshot-1-123",
        step: 1,
        timestamp: "2024-01-01T00:00:00.000Z",
        gitCommit: "abc123",
        gitBranch: "main",
        description: "Test",
        validationPassed: true,
        files: { workflowState: "", activityLog: "", guardianState: "" },
      };

      mockReadFileSync.mockReturnValue(JSON.stringify(snapshot));

      const result = listSnapshots();

      expect(result).toHaveLength(1);
      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSnapshot", () => {
    it("should return snapshot for specific step", () => {
      const snapshots: Snapshot[] = [
        {
          id: "snapshot-1-123",
          step: 1,
          timestamp: "2024-01-01T00:00:00.000Z",
          gitCommit: "abc123",
          gitBranch: "main",
          description: "First",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
        {
          id: "snapshot-2-123",
          step: 2,
          timestamp: "2024-01-01T01:00:00.000Z",
          gitCommit: "def456",
          gitBranch: "main",
          description: "Second",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
      ];

      mockReaddirSync.mockReturnValue([
        "snapshot-1-123.json",
        "snapshot-2-123.json",
      ]);

      mockReadFileSync.mockImplementation((path: any) => {
        if (path.includes("snapshot-1-123.json")) return JSON.stringify(snapshots[0]);
        if (path.includes("snapshot-2-123.json")) return JSON.stringify(snapshots[1]);
        return "{}";
      });

      const result = getSnapshot(2);

      expect(result).toEqual(snapshots[1]);
    });

    it("should return null if step not found", () => {
      mockReaddirSync.mockReturnValue([]);

      const result = getSnapshot(99);

      expect(result).toBeNull();
    });
  });

  describe("rollbackToStep", () => {
    it("should restore state files and git commit", () => {
      const snapshot: Snapshot = {
        id: "snapshot-3-123",
        step: 3,
        timestamp: "2024-01-01T00:00:00.000Z",
        gitCommit: "abc123def",
        gitBranch: "main",
        description: "Rollback point",
        validationPassed: true,
        files: {
          workflowState: "/path/to/workflow-state.json",
          activityLog: "/path/to/ACTIVITY.md",
          guardianState: "/path/to/guardian-state.json",
        },
      };

      mockReaddirSync.mockReturnValue(["snapshot-3-123.json"]);
      mockReadFileSync.mockReturnValue(JSON.stringify(snapshot));
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("");

      const result = rollbackToStep(3);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Rolled back to step 3");
      expect(result.message).toContain("abc123d");
      expect(mockCopyFileSync).toHaveBeenCalledTimes(3);
      expect(mockExecSync).toHaveBeenCalledWith(
        "git checkout abc123def -- .",
        expect.any(Object)
      );
    });

    it("should fail if snapshot not found", () => {
      mockReaddirSync.mockReturnValue([]);

      const result = rollbackToStep(99);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Snapshot for step 99 not found");
      expect(mockCopyFileSync).not.toHaveBeenCalled();
      expect(mockExecSync).not.toHaveBeenCalled();
    });

    it("should skip restoring missing state files", () => {
      const snapshot: Snapshot = {
        id: "snapshot-3-123",
        step: 3,
        timestamp: "2024-01-01T00:00:00.000Z",
        gitCommit: "abc123def",
        gitBranch: "main",
        description: "Rollback point",
        validationPassed: true,
        files: {
          workflowState: "/path/to/workflow-state.json",
          activityLog: "",
          guardianState: "",
        },
      };

      mockReaddirSync.mockReturnValue(["snapshot-3-123.json"]);
      mockReadFileSync.mockReturnValue(JSON.stringify(snapshot));
      
      let callCount = 0;
      mockExistsSync.mockImplementation((path: any) => {
        callCount++;
        // Only workflow-state.json exists
        return path.includes("workflow-state.json");
      });
      
      mockExecSync.mockReturnValue("");

      const result = rollbackToStep(3);

      expect(result.success).toBe(true);
      expect(mockCopyFileSync).toHaveBeenCalledTimes(1);
    });

    it("should handle git checkout errors", () => {
      const snapshot: Snapshot = {
        id: "snapshot-3-123",
        step: 3,
        timestamp: "2024-01-01T00:00:00.000Z",
        gitCommit: "abc123def",
        gitBranch: "main",
        description: "Rollback point",
        validationPassed: true,
        files: {
          workflowState: "/path/to/workflow-state.json",
          activityLog: "",
          guardianState: "",
        },
      };

      mockReaddirSync.mockReturnValue(["snapshot-3-123.json"]);
      mockReadFileSync.mockReturnValue(JSON.stringify(snapshot));
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error("Git checkout failed");
      });

      const result = rollbackToStep(3);

      expect(result.success).toBe(false);
      expect(result.message).toContain("State restored but git checkout failed");
      expect(mockCopyFileSync).toHaveBeenCalled(); // State was restored
    });
  });

  describe("formatSnapshotsForDisplay", () => {
    it("should format snapshots as markdown table", () => {
      const snapshots: Snapshot[] = [
        {
          id: "snapshot-1-123",
          step: 1,
          timestamp: "2024-01-01T10:30:00.000Z",
          gitCommit: "abc123def456",
          gitBranch: "main",
          description: "Initial setup",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
        {
          id: "snapshot-2-123",
          step: 2,
          timestamp: "2024-01-01T11:45:00.000Z",
          gitCommit: "def456abc123",
          gitBranch: "main",
          description: "Added tests",
          validationPassed: false,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
      ];

      const result = formatSnapshotsForDisplay(snapshots);

      expect(result).toContain("## State Snapshots");
      expect(result).toContain("| Step | Time | Description | Commit | Valid |");
      expect(result).toContain("| 1 |");
      expect(result).toContain("Initial setup");
      expect(result).toContain("abc123d");
      expect(result).toContain("✅");
      expect(result).toContain("| 2 |");
      expect(result).toContain("Added tests");
      expect(result).toContain("def456a");
      expect(result).toContain("❌");
    });

    it("should return message when no snapshots", () => {
      const result = formatSnapshotsForDisplay([]);
      expect(result).toBe("No snapshots yet.");
    });

    it("should format single snapshot", () => {
      const snapshots: Snapshot[] = [
        {
          id: "snapshot-1-123",
          step: 1,
          timestamp: "2024-01-01T10:30:00.000Z",
          gitCommit: "abc123def456",
          gitBranch: "main",
          description: "Test",
          validationPassed: true,
          files: { workflowState: "", activityLog: "", guardianState: "" },
        },
      ];

      const result = formatSnapshotsForDisplay(snapshots);

      expect(result).toContain("## State Snapshots");
      expect(result).toContain("| 1 |");
      expect(result).toContain("Test");
    });
  });
});
