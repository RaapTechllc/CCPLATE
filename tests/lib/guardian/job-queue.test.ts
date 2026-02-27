/**
 * Tests for Job Queue module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createJob,
  updateJob,
  getJob,
  getPendingJobs,
  getPausedJobs,
  getJobsAwaitingHitl,
  getJobsBySource,
  getAllJobs,
  pauseJob,
  resumeJob,
  getJobByHitlRequest,
  type GuardianJob,
} from "../../../src/lib/guardian/job-queue";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;

describe("Job Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createJob", () => {
    it("should create job with generated ID and pending status", () => {
      const job = createJob({
        command: "test",
        args: "--all",
        source: {
          type: "cli",
        },
      });

      expect(job.id).toMatch(/^job-\d+-[a-z0-9]{6}$/);
      expect(job.status).toBe("pending");
      expect(job.createdAt).toBeTruthy();
      expect(job.command).toBe("test");
      expect(job.args).toBe("--all");
    });

    it("should create memory directory if missing", () => {
      mockExistsSync.mockReturnValue(false);

      createJob({
        command: "test",
        args: "",
        source: { type: "cli" },
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should support GitHub issue source", () => {
      const job = createJob({
        command: "fix",
        args: "",
        source: {
          type: "github_issue",
          repo: "owner/repo",
          issueNumber: 123,
          author: "user1",
        },
      });

      expect(job.source.type).toBe("github_issue");
      expect(job.source.repo).toBe("owner/repo");
      expect(job.source.issueNumber).toBe(123);
      expect(job.source.author).toBe("user1");
    });

    it("should support GitHub PR source", () => {
      const job = createJob({
        command: "review",
        args: "",
        source: {
          type: "github_pr",
          repo: "owner/repo",
          prNumber: 456,
          author: "user2",
        },
      });

      expect(job.source.type).toBe("github_pr");
      expect(job.source.prNumber).toBe(456);
    });

    it("should include optional worktreeId", () => {
      const job = createJob({
        command: "test",
        args: "",
        source: { type: "cli" },
        worktreeId: "worktree-123",
      });

      expect(job.worktreeId).toBe("worktree-123");
    });

    it("should include optional artifacts", () => {
      const job = createJob({
        command: "build",
        args: "",
        source: { type: "cli" },
        artifacts: ["artifact-1", "artifact-2"],
      });

      expect(job.artifacts).toEqual(["artifact-1", "artifact-2"]);
    });

    it("should save job to file", () => {
      createJob({
        command: "test",
        args: "",
        source: { type: "cli" },
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("guardian-jobs.json"),
        expect.any(String)
      );

      const written = (mockWriteFileSync as any).mock.calls[0][1];
      expect(written).toContain('"command"');
      expect(written).toContain('"test"');
    });
  });

  describe("updateJob", () => {
    it("should update existing job", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "pending",
          command: "test",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const updated = updateJob("job-1", {
        status: "running",
        startedAt: "2024-01-01T01:00:00.000Z",
      });

      expect(updated?.status).toBe("running");
      expect(updated?.startedAt).toBe("2024-01-01T01:00:00.000Z");
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should return null for non-existent job", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = updateJob("job-nonexistent", { status: "running" });

      expect(result).toBeNull();
    });

    it("should allow partial updates", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "pending",
          command: "test",
          args: "--all",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const updated = updateJob("job-1", {
        error: "Something went wrong",
      });

      expect(updated?.status).toBe("pending"); // Unchanged
      expect(updated?.command).toBe("test"); // Unchanged
      expect(updated?.error).toBe("Something went wrong"); // Updated
    });
  });

  describe("getJob", () => {
    it("should return job by ID", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "pending",
          command: "test",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "job-2",
          status: "running",
          command: "build",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T01:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getJob("job-2");

      expect(result?.id).toBe("job-2");
      expect(result?.command).toBe("build");
    });

    it("should return null for non-existent job", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getJob("job-nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getPendingJobs", () => {
    it("should return only pending jobs", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "pending",
          command: "test1",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "job-2",
          status: "running",
          command: "test2",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T01:00:00.000Z",
        },
        {
          id: "job-3",
          status: "pending",
          command: "test3",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T02:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getPendingJobs();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("job-1");
      expect(result[1].id).toBe("job-3");
    });

    it("should return empty array when no pending jobs", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getPendingJobs();

      expect(result).toEqual([]);
    });
  });

  describe("getPausedJobs", () => {
    it("should return only paused jobs", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "paused",
          command: "test1",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "job-2",
          status: "running",
          command: "test2",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T01:00:00.000Z",
        },
        {
          id: "job-3",
          status: "paused",
          command: "test3",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T02:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getPausedJobs();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("job-1");
      expect(result[1].id).toBe("job-3");
    });
  });

  describe("getJobsAwaitingHitl", () => {
    it("should return only paused jobs with HITL requests", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "paused",
          command: "test1",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
          awaitingHitl: {
            requestId: "hitl-1",
            reason: "Need approval",
            pausedAt: "2024-01-01T00:00:00.000Z",
          },
        },
        {
          id: "job-2",
          status: "paused",
          command: "test2",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T01:00:00.000Z",
        },
        {
          id: "job-3",
          status: "running",
          command: "test3",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T02:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getJobsAwaitingHitl();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("job-1");
    });
  });

  describe("getJobsBySource", () => {
    it("should return jobs by repo and issue number", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "pending",
          command: "test1",
          args: "",
          source: {
            type: "github_issue",
            repo: "owner/repo",
            issueNumber: 123,
          },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "job-2",
          status: "running",
          command: "test2",
          args: "",
          source: {
            type: "github_issue",
            repo: "owner/other",
            issueNumber: 123,
          },
          createdAt: "2024-01-01T01:00:00.000Z",
        },
        {
          id: "job-3",
          status: "pending",
          command: "test3",
          args: "",
          source: {
            type: "github_pr",
            repo: "owner/repo",
            prNumber: 123,
          },
          createdAt: "2024-01-01T02:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getJobsBySource("owner/repo", 123);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("job-1");
      expect(result[1].id).toBe("job-3");
    });

    it("should return empty array when no matches", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getJobsBySource("owner/repo", 999);

      expect(result).toEqual([]);
    });
  });

  describe("getAllJobs", () => {
    it("should return all jobs", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "pending",
          command: "test1",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "job-2",
          status: "running",
          command: "test2",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T01:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getAllJobs();

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no jobs file", () => {
      mockExistsSync.mockReturnValue(false);

      const result = getAllJobs();

      expect(result).toEqual([]);
    });
  });

  describe("pauseJob", () => {
    it("should pause a job", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "running",
          command: "test",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = pauseJob("job-1");

      expect(result?.status).toBe("paused");
      expect(result?.pausedAt).toBeTruthy();
      expect(result?.awaitingHitl).toBeUndefined();
    });

    it("should pause with HITL request", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "running",
          command: "test",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = pauseJob("job-1", "hitl-123", "Need approval");

      expect(result?.status).toBe("paused");
      expect(result?.awaitingHitl).toEqual({
        requestId: "hitl-123",
        reason: "Need approval",
        pausedAt: expect.any(String),
      });
    });

    it("should return null for non-existent job", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = pauseJob("job-nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("resumeJob", () => {
    it("should resume a paused job", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "paused",
          command: "test",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
          pausedAt: "2024-01-01T01:00:00.000Z",
          awaitingHitl: {
            requestId: "hitl-123",
            reason: "Test",
            pausedAt: "2024-01-01T01:00:00.000Z",
          },
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = resumeJob("job-1");

      expect(result?.status).toBe("running");
      expect(result?.resumedAt).toBeTruthy();
      expect(result?.awaitingHitl).toBeUndefined();
    });

    it("should return null for non-paused job", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "running",
          command: "test",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = resumeJob("job-1");

      expect(result).toBeNull();
    });

    it("should return null for non-existent job", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = resumeJob("job-nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getJobByHitlRequest", () => {
    it("should return job waiting on HITL request", () => {
      const existingJobs: GuardianJob[] = [
        {
          id: "job-1",
          status: "paused",
          command: "test1",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T00:00:00.000Z",
          awaitingHitl: {
            requestId: "hitl-123",
            reason: "Test",
            pausedAt: "2024-01-01T00:00:00.000Z",
          },
        },
        {
          id: "job-2",
          status: "paused",
          command: "test2",
          args: "",
          source: { type: "cli" },
          createdAt: "2024-01-01T01:00:00.000Z",
          awaitingHitl: {
            requestId: "hitl-456",
            reason: "Test",
            pausedAt: "2024-01-01T01:00:00.000Z",
          },
        },
      ];

      mockReadFileSync.mockReturnValue(JSON.stringify(existingJobs));

      const result = getJobByHitlRequest("hitl-456");

      expect(result?.id).toBe("job-2");
    });

    it("should return null when no matching HITL request", () => {
      mockReadFileSync.mockReturnValue(JSON.stringify([]));

      const result = getJobByHitlRequest("hitl-nonexistent");

      expect(result).toBeNull();
    });
  });
});
