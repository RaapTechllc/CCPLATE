/**
 * Tests for Merge Ledger module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  recordMerge,
  getMergeHistory,
  getLastMerge,
  rollbackMerge,
  formatMergeHistory,
  type MergeRecord,
} from "../../../src/lib/guardian/merge-ledger";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

// Mock security
vi.mock("../../../src/lib/guardian/security", () => ({
  validateGitRef: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { spawnSync } from "child_process";
import { validateGitRef } from "../../../src/lib/guardian/security";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockAppendFileSync = appendFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;
const mockValidateGitRef = validateGitRef as ReturnType<typeof vi.fn>;

describe("Merge Ledger", () => {
  const rootDir = "/test/root";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockValidateGitRef.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("recordMerge", () => {
    it("should create merge record with all fields", () => {
      const options = {
        worktreeId: "wt-123",
        branch: "feature-branch",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user@example.com",
      };

      const record = recordMerge(rootDir, options);

      expect(record.id).toMatch(/^merge-\d+-[a-z0-9]{6}$/);
      expect(record.worktreeId).toBe("wt-123");
      expect(record.branch).toBe("feature-branch");
      expect(record.targetBranch).toBe("main");
      expect(record.preMergeCommit).toBe("abc123");
      expect(record.postMergeCommit).toBe("def456");
      expect(record.mergedBy).toBe("user@example.com");
      expect(record.status).toBe("completed");
      expect(record.timestamp).toBeDefined();
    });

    it("should default mergedBy to unknown", () => {
      const options = {
        worktreeId: "wt-123",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc",
        postMergeCommit: "def",
      };

      const record = recordMerge(rootDir, options);

      expect(record.mergedBy).toBe("unknown");
    });

    it("should append record to ledger file", () => {
      const options = {
        worktreeId: "wt-123",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc",
        postMergeCommit: "def",
      };

      recordMerge(rootDir, options);

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("merge-ledger.jsonl"),
        expect.stringContaining('"worktreeId":"wt-123"')
      );
    });

    it("should create directory if not exists", () => {
      mockExistsSync.mockReturnValue(false);

      const options = {
        worktreeId: "wt-123",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc",
        postMergeCommit: "def",
      };

      recordMerge(rootDir, options);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });
  });

  describe("getMergeHistory", () => {
    it("should return empty array when no ledger file", () => {
      mockExistsSync.mockReturnValue(false);

      const history = getMergeHistory(rootDir);

      expect(history).toEqual([]);
    });

    it("should parse and return merge records", () => {
      const record1: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature-1",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user1",
        status: "completed",
      };

      const record2: MergeRecord = {
        id: "merge-2",
        timestamp: "2024-01-02T00:00:00Z",
        worktreeId: "wt-2",
        branch: "feature-2",
        targetBranch: "main",
        preMergeCommit: "ghi789",
        postMergeCommit: "jkl012",
        mergedBy: "user2",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify(record1) + "\n" + JSON.stringify(record2) + "\n"
      );

      const history = getMergeHistory(rootDir);

      expect(history).toHaveLength(2);
      // Should be sorted by timestamp descending
      expect(history[0].id).toBe("merge-2");
      expect(history[1].id).toBe("merge-1");
    });

    it("should filter by branch", () => {
      const record1: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature-1",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user1",
        status: "completed",
      };

      const record2: MergeRecord = {
        id: "merge-2",
        timestamp: "2024-01-02T00:00:00Z",
        worktreeId: "wt-2",
        branch: "feature-2",
        targetBranch: "develop",
        preMergeCommit: "ghi789",
        postMergeCommit: "jkl012",
        mergedBy: "user2",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify(record1) + "\n" + JSON.stringify(record2) + "\n"
      );

      const history = getMergeHistory(rootDir, { branch: "feature-1" });

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("merge-1");
    });

    it("should filter by target branch", () => {
      const record1: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature-1",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user1",
        status: "completed",
      };

      const record2: MergeRecord = {
        id: "merge-2",
        timestamp: "2024-01-02T00:00:00Z",
        worktreeId: "wt-2",
        branch: "feature-2",
        targetBranch: "develop",
        preMergeCommit: "ghi789",
        postMergeCommit: "jkl012",
        mergedBy: "user2",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify(record1) + "\n" + JSON.stringify(record2) + "\n"
      );

      const history = getMergeHistory(rootDir, { branch: "develop" });

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("merge-2");
    });

    it("should apply limit", () => {
      const records = [
        { id: "merge-1", timestamp: "2024-01-01T00:00:00Z" },
        { id: "merge-2", timestamp: "2024-01-02T00:00:00Z" },
        { id: "merge-3", timestamp: "2024-01-03T00:00:00Z" },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        records.map((r) => JSON.stringify({ ...r, worktreeId: "wt", branch: "f", targetBranch: "m", preMergeCommit: "a", postMergeCommit: "b", mergedBy: "u", status: "completed" })).join("\n") + "\n"
      );

      const history = getMergeHistory(rootDir, { limit: 2 });

      expect(history).toHaveLength(2);
    });

    it("should skip malformed JSON lines", () => {
      const validRecord: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature-1",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user1",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        "invalid json\n" + JSON.stringify(validRecord) + "\n"
      );

      const history = getMergeHistory(rootDir);

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("merge-1");
    });
  });

  describe("getLastMerge", () => {
    it("should return most recent merge", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc",
        postMergeCommit: "def",
        mergedBy: "user",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");

      const last = getLastMerge(rootDir);

      expect(last?.id).toBe("merge-1");
    });

    it("should return null when no merges", () => {
      mockExistsSync.mockReturnValue(false);

      const last = getLastMerge(rootDir);

      expect(last).toBeNull();
    });

    it("should filter by branch", () => {
      const records = [
        {
          id: "merge-1",
          timestamp: "2024-01-01T00:00:00Z",
          branch: "feature-1",
          targetBranch: "main",
        },
        {
          id: "merge-2",
          timestamp: "2024-01-02T00:00:00Z",
          branch: "feature-2",
          targetBranch: "main",
        },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        records.map((r) => JSON.stringify({ ...r, worktreeId: "wt", preMergeCommit: "a", postMergeCommit: "b", mergedBy: "u", status: "completed" })).join("\n") + "\n"
      );

      const last = getLastMerge(rootDir, "feature-1");

      expect(last?.id).toBe("merge-1");
    });
  });

  describe("rollbackMerge", () => {
    it("should fail when no ledger file", () => {
      mockExistsSync.mockReturnValue(false);

      const result = rollbackMerge(rootDir, "merge-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("No merge history found");
    });

    it("should fail when merge record not found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("");

      const result = rollbackMerge(rootDir, "merge-999");

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should fail when merge already rolled back", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user",
        status: "rolled_back",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");

      const result = rollbackMerge(rootDir, "merge-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("already rolled back");
    });

    it("should fail on invalid preMerge commit hash", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "../invalid",
        postMergeCommit: "def456",
        mergedBy: "user",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");
      mockValidateGitRef.mockImplementation(() => {
        throw new Error("Invalid ref");
      });

      const result = rollbackMerge(rootDir, "merge-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid pre-merge commit hash");
    });

    it("should fail when preMerge commit does not exist", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");
      mockSpawnSync.mockReturnValue({ status: 1, stderr: "Not found" });

      const result = rollbackMerge(rootDir, "merge-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("no longer exists");
    });

    it("should successfully rollback merge via reset", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");

      // Mock git commands
      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: "abc123" }) // rev-parse preMergeCommit
        .mockReturnValueOnce({ status: 0, stdout: "def456" }) // rev-parse HEAD
        .mockReturnValueOnce({ status: 0 }) // reset --hard
        .mockReturnValueOnce({ status: 0, stdout: "abc123" }); // rev-parse HEAD after reset

      const result = rollbackMerge(rootDir, "merge-1", { reason: "Test rollback" });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Rolled back");
      expect(result.newCommit).toBe("abc123");
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should successfully rollback via revert when not at merge commit", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");

      // Mock git commands
      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: "abc123" }) // rev-parse preMergeCommit
        .mockReturnValueOnce({ status: 0, stdout: "ghi789" }) // rev-parse HEAD (different)
        .mockReturnValueOnce({ status: 0 }) // revert
        .mockReturnValueOnce({ status: 0, stdout: "jkl012" }); // rev-parse HEAD after revert

      const result = rollbackMerge(rootDir, "merge-1");

      expect(result.success).toBe(true);
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["revert"]),
        expect.any(Object)
      );
    });

    it("should fail when reset fails", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc123",
        postMergeCommit: "def456",
        mergedBy: "user",
        status: "completed",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(record) + "\n");

      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: "abc123" }) // rev-parse preMergeCommit
        .mockReturnValueOnce({ status: 0, stdout: "def456" }) // rev-parse HEAD
        .mockReturnValueOnce({ status: 1, stderr: "Reset failed" }); // reset fails

      const result = rollbackMerge(rootDir, "merge-1");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Rollback failed");
    });
  });

  describe("formatMergeHistory", () => {
    it("should return message when no records", () => {
      const formatted = formatMergeHistory([]);

      expect(formatted).toBe("No merge history found");
    });

    it("should format completed merge", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature-branch",
        targetBranch: "main",
        preMergeCommit: "abc123def",
        postMergeCommit: "def456ghi",
        mergedBy: "user@example.com",
        status: "completed",
      };

      const formatted = formatMergeHistory([record]);

      expect(formatted).toContain("✅ COMPLETED");
      expect(formatted).toContain("merge-1");
      expect(formatted).toContain("feature-branch → main");
      expect(formatted).toContain("user@example.com");
      expect(formatted).toContain("abc123de → def456gh");
    });

    it("should format rolled back merge", () => {
      const record: MergeRecord = {
        id: "merge-1",
        timestamp: "2024-01-01T00:00:00Z",
        worktreeId: "wt-1",
        branch: "feature",
        targetBranch: "main",
        preMergeCommit: "abc123def",
        postMergeCommit: "def456ghi",
        mergedBy: "user",
        status: "rolled_back",
        rollbackCommit: "ghi789jkl",
        rollbackTimestamp: "2024-01-02T00:00:00Z",
        rollbackReason: "Test failure",
      };

      const formatted = formatMergeHistory([record]);

      expect(formatted).toContain("🔄 ROLLED BACK");
      expect(formatted).toContain("ghi789jk");
      expect(formatted).toContain("Test failure");
    });

    it("should format multiple records", () => {
      const records: MergeRecord[] = [
        {
          id: "merge-1",
          timestamp: "2024-01-01T00:00:00Z",
          worktreeId: "wt-1",
          branch: "f1",
          targetBranch: "main",
          preMergeCommit: "abc",
          postMergeCommit: "def",
          mergedBy: "user1",
          status: "completed",
        },
        {
          id: "merge-2",
          timestamp: "2024-01-02T00:00:00Z",
          worktreeId: "wt-2",
          branch: "f2",
          targetBranch: "main",
          preMergeCommit: "ghi",
          postMergeCommit: "jkl",
          mergedBy: "user2",
          status: "completed",
        },
      ];

      const formatted = formatMergeHistory(records);

      expect(formatted).toContain("merge-1");
      expect(formatted).toContain("merge-2");
    });
  });
});
