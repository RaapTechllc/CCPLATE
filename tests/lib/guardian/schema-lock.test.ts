/**
 * Tests for Schema Lock module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  acquireSchemaLock,
  releaseSchemaLock,
  getSchemaLockStatus,
  isSchemaLocked,
  isSchemaLockedByOther,
  type SchemaLock,
  type LockResult,
} from "../../../src/lib/guardian/schema-lock";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockUnlinkSync = unlinkSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;

describe("Schema Lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("acquireSchemaLock", () => {
    it("should acquire lock when no lock exists", () => {
      // First call for MEMORY_DIR in ensureMemoryDir (true), second call for LOCK_FILE (false)
      mockExistsSync.mockReturnValueOnce(true); // MEMORY_DIR exists
      mockExistsSync.mockReturnValueOnce(false); // LOCK_FILE doesn't exist

      const result = acquireSchemaLock("worktree-1", "migrate");

      expect(result.acquired).toBe(true);
      expect(result.message).toContain("Schema lock acquired for migrate");
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockMkdirSync).not.toHaveBeenCalled(); // Directory exists
    });

    it("should create memory directory if missing", () => {
      mockExistsSync.mockReturnValueOnce(false); // LOCK_FILE doesn't exist
      mockExistsSync.mockReturnValueOnce(false); // MEMORY_DIR doesn't exist (for ensureMemoryDir)

      acquireSchemaLock("worktree-1", "migrate");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should support all operation types", () => {
      const operations: Array<SchemaLock["operation"]> = ["migrate", "push", "edit"];

      operations.forEach((operation) => {
        vi.clearAllMocks();
        mockExistsSync.mockReturnValue(false);

        const result = acquireSchemaLock("worktree-1", operation);

        expect(result.acquired).toBe(true);
        expect(result.message).toContain(operation);
      });
    });

    it("should write lock with correct structure", () => {
      mockExistsSync.mockReturnValue(false);

      acquireSchemaLock("worktree-1", "push");

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("schema.lock"),
        expect.stringContaining("worktree-1")
      );

      const writtenContent = (mockWriteFileSync as any).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);
      expect(parsed.worktreeId).toBe("worktree-1");
      expect(parsed.operation).toBe("push");
      expect(parsed.acquiredAt).toBeTruthy();
      expect(parsed.expiresAt).toBeTruthy();
    });

    it("should set expiration time to 30 minutes", () => {
      mockExistsSync.mockReturnValue(false);

      const before = Date.now();
      acquireSchemaLock("worktree-1", "migrate");
      const after = Date.now();

      const writtenContent = (mockWriteFileSync as any).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);
      const expiresAt = new Date(parsed.expiresAt).getTime();
      const acquiredAt = new Date(parsed.acquiredAt).getTime();

      const diffMs = expiresAt - acquiredAt;
      expect(diffMs).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000); // Allow 1s tolerance
      expect(diffMs).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);
    });

    it("should fail to acquire lock held by another worktree", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-other",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = acquireSchemaLock("worktree-1", "push");

      expect(result.acquired).toBe(false);
      expect(result.holder).toEqual(existingLock);
      expect(result.message).toContain("worktree-other");
      expect(result.message).toContain("migrate");
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should allow re-entry for same worktree", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = acquireSchemaLock("worktree-1", "push");

      expect(result.acquired).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should acquire expired lock", () => {
      const expiredLock: SchemaLock = {
        worktreeId: "worktree-other",
        operation: "migrate",
        acquiredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 10 * 1000).toISOString(), // Expired 10 seconds ago
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(expiredLock));

      const result = acquireSchemaLock("worktree-1", "edit");

      expect(result.acquired).toBe(true);
      expect(mockUnlinkSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("releaseSchemaLock", () => {
    it("should release lock held by same worktree", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = releaseSchemaLock("worktree-1");

      expect(result).toBe(true);
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should not release lock held by another worktree", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-other",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = releaseSchemaLock("worktree-1");

      expect(result).toBe(false);
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });

    it("should return true if no lock exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = releaseSchemaLock("worktree-1");

      expect(result).toBe(true);
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("getSchemaLockStatus", () => {
    it("should return lock status when lock exists", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: "2024-01-01T00:00:00.000Z",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = getSchemaLockStatus();

      expect(result).toEqual(existingLock);
    });

    it("should return null when no lock exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = getSchemaLockStatus();

      expect(result).toBeNull();
    });

    it("should delete and return null for expired lock", () => {
      const expiredLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 10 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(expiredLock));

      const result = getSchemaLockStatus();

      expect(result).toBeNull();
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it("should return null for malformed lock file", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json");

      const result = getSchemaLockStatus();

      expect(result).toBeNull();
    });
  });

  describe("isSchemaLocked", () => {
    it("should return true when lock exists", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = isSchemaLocked();

      expect(result).toBe(true);
    });

    it("should return false when no lock exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = isSchemaLocked();

      expect(result).toBe(false);
    });

    it("should return false when lock is expired", () => {
      const expiredLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 10 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(expiredLock));

      const result = isSchemaLocked();

      expect(result).toBe(false);
    });
  });

  describe("isSchemaLockedByOther", () => {
    it("should return lock when held by different worktree", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-other",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = isSchemaLockedByOther("worktree-1");

      expect(result).toEqual(existingLock);
    });

    it("should return null when held by same worktree", () => {
      const existingLock: SchemaLock = {
        worktreeId: "worktree-1",
        operation: "migrate",
        acquiredAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingLock));

      const result = isSchemaLockedByOther("worktree-1");

      expect(result).toBeNull();
    });

    it("should return null when no lock exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = isSchemaLockedByOther("worktree-1");

      expect(result).toBeNull();
    });

    it("should return null when lock is expired", () => {
      const expiredLock: SchemaLock = {
        worktreeId: "worktree-other",
        operation: "migrate",
        acquiredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 10 * 1000).toISOString(),
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(expiredLock));

      const result = isSchemaLockedByOther("worktree-1");

      expect(result).toBeNull();
    });
  });
});
