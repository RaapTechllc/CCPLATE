/**
 * Tests for Worktree Resolver module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadState,
  saveState,
  findWorktreeForEntity,
  associateEntityWithWorktree,
  getOrCreateWorktreeForEntity,
  removeWorktreeAssociation,
  cleanupStaleAssociations,
} from "../../../src/lib/guardian/worktree-resolver";
import type { WorkflowState, WorktreeEntity } from "@/types/worktree";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;

describe("Worktree Resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadState", () => {
    it("should return default state when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const state = loadState();

      expect(state).toEqual({
        session_id: null,
        current_prp_step: 0,
        total_prp_steps: 0,
        files_changed: 0,
        last_commit_time: null,
        last_test_time: null,
        context_pressure: 0,
        active_worktrees: [],
        worktree_associations: [],
        artifact_chain: [],
        pending_nudges: [],
        errors_detected: [],
        lsp_diagnostics_count: 0,
        untested_additions: [],
      });
    });

    it("should load and merge state from file", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          session_id: "test-session",
          files_changed: 5,
          active_worktrees: [
            { id: "wt-1", path: "/path", branch: "main" },
          ],
        })
      );

      const state = loadState();

      expect(state.session_id).toBe("test-session");
      expect(state.files_changed).toBe(5);
      expect(state.active_worktrees).toHaveLength(1);
      expect(state.worktree_associations).toEqual([]);
    });
  });

  describe("saveState", () => {
    it("should write state to file as JSON", () => {
      const state: WorkflowState = {
        session_id: "test",
        current_prp_step: 1,
        total_prp_steps: 5,
        files_changed: 3,
        last_commit_time: null,
        last_test_time: null,
        context_pressure: 20,
        active_worktrees: [],
        worktree_associations: [],
        artifact_chain: [],
        pending_nudges: [],
        errors_detected: [],
        lsp_diagnostics_count: 0,
        untested_additions: [],
      };

      saveState(state);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("workflow-state.json"),
        JSON.stringify(state, null, 2)
      );
    });
  });

  describe("findWorktreeForEntity", () => {
    it("should return null when no associations exist", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [] })
      );

      const result = findWorktreeForEntity("issue", 123, "owner/repo");

      expect(result).toBeNull();
    });

    it("should find association for matching entity", () => {
      const association = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "feature",
        entities: [
          { type: "issue", id: 123, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [association] })
      );

      const result = findWorktreeForEntity("issue", 123, "owner/repo");

      expect(result).toEqual(association);
    });

    it("should not find association for different entity type", () => {
      const association = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "feature",
        entities: [
          { type: "pr", id: 123, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [association] })
      );

      const result = findWorktreeForEntity("issue", 123, "owner/repo");

      expect(result).toBeNull();
    });

    it("should not find association for different repo", () => {
      const association = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "feature",
        entities: [
          { type: "issue", id: 123, repo: "other/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [association] })
      );

      const result = findWorktreeForEntity("issue", 123, "owner/repo");

      expect(result).toBeNull();
    });
  });

  describe("associateEntityWithWorktree", () => {
    it("should create new association when worktree exists", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          active_worktrees: [
            { id: "wt-1", path: "/path", branch: "main" },
          ],
          worktree_associations: [],
        })
      );

      const entity: WorktreeEntity = {
        type: "issue",
        id: 123,
        repo: "owner/repo",
      };

      associateEntityWithWorktree("wt-1", entity);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations).toHaveLength(1);
      expect(savedState.worktree_associations[0].worktreeId).toBe("wt-1");
    });

    it("should add entity to existing association", () => {
      const existingAssociation = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "main",
        entities: [
          { type: "issue", id: 100, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          active_worktrees: [
            { id: "wt-1", path: "/path", branch: "main" },
          ],
          worktree_associations: [existingAssociation],
        })
      );

      const entity: WorktreeEntity = {
        type: "pr",
        id: 200,
        repo: "owner/repo",
      };

      associateEntityWithWorktree("wt-1", entity);

      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations[0].entities).toHaveLength(2);
    });

    it("should not duplicate existing entity", () => {
      const existingAssociation = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "main",
        entities: [
          { type: "issue", id: 123, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          active_worktrees: [
            { id: "wt-1", path: "/path", branch: "main" },
          ],
          worktree_associations: [existingAssociation],
        })
      );

      const entity: WorktreeEntity = {
        type: "issue",
        id: 123,
        repo: "owner/repo",
      };

      associateEntityWithWorktree("wt-1", entity);

      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations[0].entities).toHaveLength(1);
    });

    it("should do nothing if worktree does not exist", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          active_worktrees: [],
          worktree_associations: [],
        })
      );

      const entity: WorktreeEntity = {
        type: "issue",
        id: 123,
        repo: "owner/repo",
      };

      associateEntityWithWorktree("wt-1", entity);

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should update lastAccessedAt when adding to existing association", () => {
      const existingAssociation = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "main",
        entities: [
          { type: "issue", id: 100, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          active_worktrees: [
            { id: "wt-1", path: "/path", branch: "main" },
          ],
          worktree_associations: [existingAssociation],
        })
      );

      const entity: WorktreeEntity = {
        type: "pr",
        id: 200,
        repo: "owner/repo",
      };

      associateEntityWithWorktree("wt-1", entity);

      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations[0].lastAccessedAt).not.toBe(
        "2024-01-01T00:00:00Z"
      );
    });
  });

  describe("getOrCreateWorktreeForEntity", () => {
    it("should return existing worktree when found", () => {
      const association = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "feature",
        entities: [
          { type: "issue", id: 123, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [association] })
      );

      const result = getOrCreateWorktreeForEntity("issue", 123, "owner/repo");

      expect(result).toEqual({
        worktreeId: "wt-1",
        isNew: false,
        path: "/path",
      });
    });

    it("should create new worktree ID when not found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [] })
      );

      const result = getOrCreateWorktreeForEntity("issue", 123, "owner/repo");

      expect(result).toEqual({
        worktreeId: "issue-123",
        isNew: true,
      });
    });

    it("should create new worktree ID for PR", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [] })
      );

      const result = getOrCreateWorktreeForEntity("pr", 456, "owner/repo");

      expect(result).toEqual({
        worktreeId: "pr-456",
        isNew: true,
      });
    });

    it("should update lastAccessedAt when returning existing worktree", () => {
      const association = {
        worktreeId: "wt-1",
        worktreePath: "/path",
        branch: "feature",
        entities: [
          { type: "issue", id: 123, repo: "owner/repo" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
        lastAccessedAt: "2024-01-01T00:00:00Z",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [association] })
      );

      getOrCreateWorktreeForEntity("issue", 123, "owner/repo");

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations[0].lastAccessedAt).not.toBe(
        "2024-01-01T00:00:00Z"
      );
    });
  });

  describe("removeWorktreeAssociation", () => {
    it("should remove association by worktreeId", () => {
      const associations = [
        {
          worktreeId: "wt-1",
          worktreePath: "/path1",
          branch: "feature1",
          entities: [],
          createdAt: "2024-01-01T00:00:00Z",
          lastAccessedAt: "2024-01-01T00:00:00Z",
        },
        {
          worktreeId: "wt-2",
          worktreePath: "/path2",
          branch: "feature2",
          entities: [],
          createdAt: "2024-01-01T00:00:00Z",
          lastAccessedAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: associations })
      );

      removeWorktreeAssociation("wt-1");

      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations).toHaveLength(1);
      expect(savedState.worktree_associations[0].worktreeId).toBe("wt-2");
    });

    it("should handle removing non-existent association", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ worktree_associations: [] })
      );

      removeWorktreeAssociation("wt-1");

      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations).toHaveLength(0);
    });
  });

  describe("cleanupStaleAssociations", () => {
    it("should remove associations for non-active worktrees", () => {
      const state = {
        active_worktrees: [{ id: "wt-1", path: "/path", branch: "main" }],
        worktree_associations: [
          {
            worktreeId: "wt-1",
            worktreePath: "/path1",
            branch: "feature1",
            entities: [],
            createdAt: "2024-01-01T00:00:00Z",
            lastAccessedAt: "2024-01-01T00:00:00Z",
          },
          {
            worktreeId: "wt-2",
            worktreePath: "/path2",
            branch: "feature2",
            entities: [],
            createdAt: "2024-01-01T00:00:00Z",
            lastAccessedAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      const removed = cleanupStaleAssociations();

      expect(removed).toBe(1);
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.worktree_associations).toHaveLength(1);
      expect(savedState.worktree_associations[0].worktreeId).toBe("wt-1");
    });

    it("should return 0 when no stale associations", () => {
      const state = {
        active_worktrees: [
          { id: "wt-1", path: "/path", branch: "main" },
          { id: "wt-2", path: "/path2", branch: "feature" },
        ],
        worktree_associations: [
          {
            worktreeId: "wt-1",
            worktreePath: "/path1",
            branch: "feature1",
            entities: [],
            createdAt: "2024-01-01T00:00:00Z",
            lastAccessedAt: "2024-01-01T00:00:00Z",
          },
          {
            worktreeId: "wt-2",
            worktreePath: "/path2",
            branch: "feature2",
            entities: [],
            createdAt: "2024-01-01T00:00:00Z",
            lastAccessedAt: "2024-01-01T00:00:00Z",
          },
        ],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      const removed = cleanupStaleAssociations();

      expect(removed).toBe(0);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should handle empty associations", () => {
      const state = {
        active_worktrees: [{ id: "wt-1", path: "/path", branch: "main" }],
        worktree_associations: [],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      const removed = cleanupStaleAssociations();

      expect(removed).toBe(0);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });
});
