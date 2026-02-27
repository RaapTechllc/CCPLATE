/**
 * Tests for HITL (Human In The Loop) module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  requestHumanDecision,
  resolveHITLRequest,
  getPendingHITLRequests,
  getHITLRequest,
  getAllHITLRequests,
  needsHumanApproval,
  type HITLRequest,
  type HITLReason,
} from "../../../src/lib/guardian/hitl";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock job-queue
vi.mock("../../../src/lib/guardian/job-queue", () => ({
  getJobByHitlRequest: vi.fn(),
  resumeJob: vi.fn(),
  pauseJob: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { getJobByHitlRequest, resumeJob, pauseJob } from "../../../src/lib/guardian/job-queue";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockGetJobByHitlRequest = getJobByHitlRequest as ReturnType<typeof vi.fn>;
const mockResumeJob = resumeJob as ReturnType<typeof vi.fn>;
const mockPauseJob = pauseJob as ReturnType<typeof vi.fn>;

describe("HITL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([]));
    // Suppress console output in tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestHumanDecision", () => {
    it("should create HITL request with generated ID", () => {
      const request = {
        reason: "schema_destructive" as HITLReason,
        title: "Drop table confirmation",
        description: "About to drop users table",
        context: { files: ["schema.sql"] },
      };

      const result = requestHumanDecision(request);

      expect(result.id).toMatch(/^hitl-\d+-[a-z0-9]{4}$/);
      expect(result.status).toBe("pending");
      expect(result.reason).toBe("schema_destructive");
      expect(result.title).toBe("Drop table confirmation");
      expect(result.createdAt).toBeDefined();
    });

    it("should save request to file", () => {
      const request = {
        reason: "security_change" as HITLReason,
        title: "Auth change",
        description: "Updating auth logic",
        context: {},
      };

      requestHumanDecision(request);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("hitl-requests.json"),
        expect.any(String)
      );
    });

    it("should pause job when jobId is provided", () => {
      const request = {
        jobId: "job-123",
        reason: "merge_conflict" as HITLReason,
        title: "Merge conflict",
        description: "Cannot auto-resolve",
        context: {},
      };

      requestHumanDecision(request);

      expect(mockPauseJob).toHaveBeenCalledWith(
        "job-123",
        expect.stringMatching(/^hitl-/),
        "merge_conflict"
      );
    });

    it("should not pause job when no jobId", () => {
      const request = {
        reason: "architecture_fork" as HITLReason,
        title: "Design decision",
        description: "Multiple valid approaches",
        context: {},
      };

      requestHumanDecision(request);

      expect(mockPauseJob).not.toHaveBeenCalled();
    });

    it("should include worktreeId in request", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const request = {
        worktreeId: "wt-123",
        reason: "test_failure_ambiguous" as HITLReason,
        title: "Test failure",
        description: "Cannot determine if flaky",
        context: {},
      };

      const result = requestHumanDecision(request);

      expect(result.worktreeId).toBe("wt-123");
    });

    it("should handle context with options", () => {
      const request = {
        reason: "architecture_fork" as HITLReason,
        title: "Choose approach",
        description: "Multiple valid options",
        context: {
          options: [
            { id: "a", label: "Option A", description: "First approach" },
            { id: "b", label: "Option B", description: "Second approach" },
          ],
        },
      };

      const result = requestHumanDecision(request);

      expect(result.context.options).toHaveLength(2);
    });

    it("should handle context with diff", () => {
      const request = {
        reason: "data_deletion" as HITLReason,
        title: "Data deletion",
        description: "Confirm deletion",
        context: {
          diff: "+++ DELETE FROM users",
        },
      };

      const result = requestHumanDecision(request);

      expect(result.context.diff).toContain("DELETE FROM users");
    });

    it("should create memory directory if not exists", () => {
      mockExistsSync.mockReturnValue(false);

      const request = {
        reason: "cost_threshold" as HITLReason,
        title: "Cost exceeded",
        description: "Budget limit reached",
        context: {},
      };

      requestHumanDecision(request);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });
  });

  describe("resolveHITLRequest", () => {
    it("should resolve request with approval", () => {
      const existingRequest: HITLRequest = {
        id: "hitl-123",
        reason: "schema_destructive",
        title: "Drop table",
        description: "Confirm drop",
        context: {},
        status: "pending",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockReadFileSync.mockReturnValue(JSON.stringify([existingRequest]));

      const result = resolveHITLRequest("hitl-123", "approved", "user@example.com", "LGTM");

      expect(result).toBeDefined();
      expect(result?.status).toBe("approved");
      expect(result?.resolvedBy).toBe("user@example.com");
      expect(result?.resolution).toBe("LGTM");
      expect(result?.resolvedAt).toBeDefined();
    });

    it("should resolve request with rejection", () => {
      const existingRequest: HITLRequest = {
        id: "hitl-456",
        reason: "dependency_major",
        title: "Major update",
        description: "Confirm update",
        context: {},
        status: "pending",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockReadFileSync.mockReturnValue(JSON.stringify([existingRequest]));

      const result = resolveHITLRequest("hitl-456", "rejected", "admin@example.com");

      expect(result?.status).toBe("rejected");
      expect(result?.resolvedBy).toBe("admin@example.com");
    });

    it("should return null for non-existent request", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = resolveHITLRequest("hitl-999", "approved", "user@example.com");

      expect(result).toBeNull();
    });

    it("should resume job when approved", () => {
      const existingRequest: HITLRequest = {
        id: "hitl-789",
        jobId: "job-456",
        reason: "merge_conflict",
        title: "Merge conflict",
        description: "Resolve conflict",
        context: {},
        status: "pending",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockReadFileSync.mockReturnValue(JSON.stringify([existingRequest]));
      mockGetJobByHitlRequest.mockReturnValue({ id: "job-456", status: "paused" });

      resolveHITLRequest("hitl-789", "approved", "user@example.com");

      expect(mockResumeJob).toHaveBeenCalledWith("job-456");
    });

    it("should not resume job when rejected", () => {
      const existingRequest: HITLRequest = {
        id: "hitl-789",
        jobId: "job-456",
        reason: "merge_conflict",
        title: "Merge conflict",
        description: "Resolve conflict",
        context: {},
        status: "pending",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockReadFileSync.mockReturnValue(JSON.stringify([existingRequest]));
      mockGetJobByHitlRequest.mockReturnValue({ id: "job-456", status: "paused" });

      resolveHITLRequest("hitl-789", "rejected", "user@example.com");

      expect(mockResumeJob).not.toHaveBeenCalled();
    });

    it("should not resume job when modified", () => {
      const existingRequest: HITLRequest = {
        id: "hitl-111",
        jobId: "job-222",
        reason: "architecture_fork",
        title: "Design choice",
        description: "Choose approach",
        context: {},
        status: "pending",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockReadFileSync.mockReturnValue(JSON.stringify([existingRequest]));
      mockGetJobByHitlRequest.mockReturnValue({ id: "job-222", status: "paused" });

      resolveHITLRequest("hitl-111", "modified", "user@example.com");

      expect(mockResumeJob).not.toHaveBeenCalled();
    });

    it("should save updated requests", () => {
      const existingRequest: HITLRequest = {
        id: "hitl-123",
        reason: "schema_destructive",
        title: "Drop table",
        description: "Confirm drop",
        context: {},
        status: "pending",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockReadFileSync.mockReturnValue(JSON.stringify([existingRequest]));

      resolveHITLRequest("hitl-123", "approved", "user@example.com");

      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("getPendingHITLRequests", () => {
    it("should return only pending requests", () => {
      const requests: HITLRequest[] = [
        {
          id: "hitl-1",
          reason: "schema_destructive",
          title: "Request 1",
          description: "Pending",
          context: {},
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "hitl-2",
          reason: "merge_conflict",
          title: "Request 2",
          description: "Approved",
          context: {},
          status: "approved",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "hitl-3",
          reason: "cost_threshold",
          title: "Request 3",
          description: "Pending",
          context: {},
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(requests));

      const result = getPendingHITLRequests();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("hitl-1");
      expect(result[1].id).toBe("hitl-3");
    });

    it("should return empty array when no pending requests", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getPendingHITLRequests();

      expect(result).toEqual([]);
    });
  });

  describe("getHITLRequest", () => {
    it("should return specific request by ID", () => {
      const requests: HITLRequest[] = [
        {
          id: "hitl-1",
          reason: "schema_destructive",
          title: "Request 1",
          description: "Test",
          context: {},
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "hitl-2",
          reason: "merge_conflict",
          title: "Request 2",
          description: "Test",
          context: {},
          status: "approved",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(requests));

      const result = getHITLRequest("hitl-2");

      expect(result).toBeDefined();
      expect(result?.id).toBe("hitl-2");
      expect(result?.status).toBe("approved");
    });

    it("should return null for non-existent ID", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getHITLRequest("hitl-999");

      expect(result).toBeNull();
    });
  });

  describe("getAllHITLRequests", () => {
    it("should return all requests", () => {
      const requests: HITLRequest[] = [
        {
          id: "hitl-1",
          reason: "schema_destructive",
          title: "Request 1",
          description: "Test",
          context: {},
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "hitl-2",
          reason: "merge_conflict",
          title: "Request 2",
          description: "Test",
          context: {},
          status: "approved",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(requests));

      const result = getAllHITLRequests();

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no requests", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getAllHITLRequests();

      expect(result).toEqual([]);
    });
  });

  describe("needsHumanApproval", () => {
    describe("schema changes", () => {
      it("should require approval for DROP", () => {
        const operation = {
          type: "schema_change",
          details: { sql: "DROP TABLE users" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("schema_destructive");
      });

      it("should require approval for ALTER DROP", () => {
        const operation = {
          type: "schema_change",
          details: { sql: "ALTER TABLE users DROP COLUMN email" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("schema_destructive");
      });

      it("should require approval for ALTER TYPE", () => {
        const operation = {
          type: "schema_change",
          details: { sql: "ALTER TABLE users ALTER COLUMN age TYPE varchar" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("schema_destructive");
      });

      it("should not require approval for safe schema changes", () => {
        const operation = {
          type: "schema_change",
          details: { sql: "ALTER TABLE users ADD COLUMN phone varchar" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });
    });

    describe("dependency updates", () => {
      it("should require approval for major version bump", () => {
        const operation = {
          type: "dependency_update",
          details: { from: "1.2.3", to: "2.0.0" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("dependency_major");
        expect(result.message).toContain("1.2.3 → 2.0.0");
      });

      it("should not require approval for minor version bump", () => {
        const operation = {
          type: "dependency_update",
          details: { from: "1.2.3", to: "1.3.0" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });

      it("should not require approval for patch version bump", () => {
        const operation = {
          type: "dependency_update",
          details: { from: "1.2.3", to: "1.2.4" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });
    });

    describe("database queries", () => {
      it("should require approval for DELETE without WHERE", () => {
        const operation = {
          type: "database_query",
          details: { query: "DELETE FROM users" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("data_deletion");
      });

      it("should not require approval for DELETE with WHERE", () => {
        const operation = {
          type: "database_query",
          details: { query: "DELETE FROM users WHERE id = 123" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });

      it("should not require approval for SELECT", () => {
        const operation = {
          type: "database_query",
          details: { query: "SELECT * FROM users" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });
    });

    describe("security changes", () => {
      it("should always require approval for security changes", () => {
        const operation = {
          type: "security_change",
          details: { change: "Updating auth middleware" },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("security_change");
      });
    });

    describe("cost checks", () => {
      it("should require approval when cost exceeds threshold", () => {
        const operation = {
          type: "cost_check",
          details: { current: 150, threshold: 100 },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(true);
        expect(result.reason).toBe("cost_threshold");
        expect(result.message).toContain("150 > 100");
      });

      it("should not require approval when cost under threshold", () => {
        const operation = {
          type: "cost_check",
          details: { current: 50, threshold: 100 },
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });
    });

    describe("unknown operations", () => {
      it("should not require approval for unknown operation types", () => {
        const operation = {
          type: "unknown_operation",
          details: {},
        };

        const result = needsHumanApproval(operation);

        expect(result.needed).toBe(false);
      });
    });
  });

  describe("error handling", () => {
    it("should handle corrupted JSON file", () => {
      mockReadFileSync.mockReturnValue("invalid json{");

      const result = getAllHITLRequests();

      expect(result).toEqual([]);
    });

    it("should create directory on save if not exists", () => {
      mockExistsSync.mockReturnValue(false);

      const request = {
        reason: "schema_destructive" as HITLReason,
        title: "Test",
        description: "Test",
        context: {},
      };

      requestHumanDecision(request);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });
  });
});
