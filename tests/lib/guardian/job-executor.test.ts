/**
 * Tests for Job Executor module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeJob, processQueue } from "../../../src/lib/guardian/job-executor";
import type { GuardianJob } from "../../../src/lib/guardian/job-queue";

// Mock child_process
vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

// Mock job-queue
vi.mock("../../../src/lib/guardian/job-queue", () => ({
  updateJob: vi.fn(),
  getPendingJobs: vi.fn(),
}));

// Mock labeling
vi.mock("../../../src/lib/guardian/labeling", () => ({
  analyzeIssue: vi.fn(),
}));

// Mock logger
vi.mock("../../../src/lib/guardian/logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock security
vi.mock("../../../src/lib/guardian/security", () => ({
  validatePositiveInteger: vi.fn(),
  validateSafeIdentifier: vi.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValidationError";
    }
  },
}));

import { spawnSync } from "child_process";
import { updateJob, getPendingJobs } from "../../../src/lib/guardian/job-queue";
import { analyzeIssue } from "../../../src/lib/guardian/labeling";
import { validatePositiveInteger, validateSafeIdentifier, ValidationError } from "../../../src/lib/guardian/security";

const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;
const mockUpdateJob = updateJob as ReturnType<typeof vi.fn>;
const mockGetPendingJobs = getPendingJobs as ReturnType<typeof vi.fn>;
const mockAnalyzeIssue = analyzeIssue as ReturnType<typeof vi.fn>;
const mockValidatePositiveInteger = validatePositiveInteger as ReturnType<typeof vi.fn>;
const mockValidateSafeIdentifier = validateSafeIdentifier as ReturnType<typeof vi.fn>;

describe("Job Executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeJob", () => {
    describe("triage command", () => {
      it("should execute triage job without worktree", async () => {
        const job: GuardianJob = {
          id: "job-1",
          command: "triage",
          args: "Bug in login flow",
          source: {
            type: "github",
            issueNumber: 123,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAnalyzeIssue.mockReturnValue({
          suggestedLabels: ["bug", "priority-high"],
          confidence: 0.9,
        });

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-1", {
          status: "running",
          startedAt: expect.any(String),
        });

        expect(mockAnalyzeIssue).toHaveBeenCalledWith(
          123,
          "Bug in login flow",
          ""
        );

        expect(mockUpdateJob).toHaveBeenCalledWith("job-1", {
          artifacts: ["labels:bug,priority-high"],
        });

        expect(mockUpdateJob).toHaveBeenCalledWith("job-1", {
          status: "completed",
          completedAt: expect.any(String),
        });
      });

      it("should not analyze when no issue number", async () => {
        const job: GuardianJob = {
          id: "job-2",
          command: "triage",
          args: "General triage",
          source: {
            type: "manual",
            userId: "user-123",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        await executeJob(job);

        expect(mockAnalyzeIssue).not.toHaveBeenCalled();
        expect(mockUpdateJob).toHaveBeenCalledWith("job-2", {
          status: "completed",
          completedAt: expect.any(String),
        });
      });
    });

    describe("investigate command", () => {
      it("should execute investigate job without worktree", async () => {
        const job: GuardianJob = {
          id: "job-3",
          command: "investigate",
          args: "Investigate error",
          source: {
            type: "github",
            issueNumber: 456,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-3", {
          status: "running",
          startedAt: expect.any(String),
        });

        expect(mockSpawnSync).not.toHaveBeenCalled();

        expect(mockUpdateJob).toHaveBeenCalledWith("job-3", {
          status: "completed",
          completedAt: expect.any(String),
        });
      });
    });

    describe("fix command with worktree", () => {
      it("should create worktree and execute fix job", async () => {
        const job: GuardianJob = {
          id: "job-4",
          command: "fix",
          args: "Fix bug",
          source: {
            type: "github",
            issueNumber: 789,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockValidatePositiveInteger.mockImplementation(() => {});
        mockValidateSafeIdentifier.mockImplementation(() => {});
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: "Worktree created",
          stderr: "",
        });

        await executeJob(job);

        expect(mockValidatePositiveInteger).toHaveBeenCalledWith(789, "issueNumber/prNumber");
        expect(mockValidateSafeIdentifier).toHaveBeenCalledWith("job-789", "worktreeId");

        expect(mockSpawnSync).toHaveBeenCalledWith(
          "bun",
          [
            "run",
            "src/cli/ccplate.ts",
            "worktree",
            "create",
            "job-789",
            "--note",
            "Job job-4",
          ],
          expect.objectContaining({
            cwd: expect.any(String),
            stdio: "pipe",
            encoding: "utf-8",
          })
        );

        expect(mockUpdateJob).toHaveBeenCalledWith("job-4", {
          worktreeId: "job-789",
        });

        expect(mockUpdateJob).toHaveBeenCalledWith("job-4", {
          status: "completed",
          completedAt: expect.any(String),
        });
      });

      it("should use timestamp when no issue number", async () => {
        const job: GuardianJob = {
          id: "job-5",
          command: "fix",
          args: "Fix issue",
          source: {
            type: "manual",
            userId: "user-123",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockValidateSafeIdentifier.mockImplementation(() => {});
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: "Worktree created",
          stderr: "",
        });

        await executeJob(job);

        expect(mockValidatePositiveInteger).not.toHaveBeenCalled();
        expect(mockSpawnSync).toHaveBeenCalledWith(
          "bun",
          expect.arrayContaining([
            "worktree",
            "create",
            expect.stringMatching(/^job-\d+$/),
          ]),
          expect.any(Object)
        );
      });

      it("should fail when worktree creation fails", async () => {
        const job: GuardianJob = {
          id: "job-6",
          command: "fix",
          args: "Fix bug",
          source: {
            type: "github",
            issueNumber: 100,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockValidatePositiveInteger.mockImplementation(() => {});
        mockValidateSafeIdentifier.mockImplementation(() => {});
        mockSpawnSync.mockReturnValue({
          status: 1,
          stdout: "",
          stderr: "Worktree already exists",
        });

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-6", {
          status: "failed",
          completedAt: expect.any(String),
          error: expect.stringContaining("Worktree creation failed"),
        });
      });

      it("should fail on invalid source ID", async () => {
        const job: GuardianJob = {
          id: "job-7",
          command: "fix",
          args: "Fix bug",
          source: {
            type: "github",
            issueNumber: -1,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockValidatePositiveInteger.mockImplementation(() => {
          throw new ValidationError("Must be positive");
        });

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-7", {
          status: "failed",
          completedAt: expect.any(String),
          error: expect.stringContaining("Invalid source ID"),
        });
      });

      it("should fail on invalid worktree ID", async () => {
        const job: GuardianJob = {
          id: "job-8",
          command: "fix",
          args: "Fix bug",
          source: {
            type: "github",
            issueNumber: 200,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockValidatePositiveInteger.mockImplementation(() => {});
        mockValidateSafeIdentifier.mockImplementation(() => {
          throw new ValidationError("Invalid identifier");
        });

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-8", {
          status: "failed",
          completedAt: expect.any(String),
          error: expect.stringContaining("Invalid worktree ID"),
        });
      });

      it("should use PR number when available", async () => {
        const job: GuardianJob = {
          id: "job-9",
          command: "fix",
          args: "Fix PR",
          source: {
            type: "github",
            prNumber: 999,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockValidatePositiveInteger.mockImplementation(() => {});
        mockValidateSafeIdentifier.mockImplementation(() => {});
        mockSpawnSync.mockReturnValue({
          status: 0,
          stdout: "Worktree created",
          stderr: "",
        });

        await executeJob(job);

        expect(mockValidatePositiveInteger).toHaveBeenCalledWith(999, "issueNumber/prNumber");
        expect(mockSpawnSync).toHaveBeenCalledWith(
          "bun",
          expect.arrayContaining(["job-999"]),
          expect.any(Object)
        );
      });
    });

    describe("review command", () => {
      it("should execute review job without worktree", async () => {
        const job: GuardianJob = {
          id: "job-10",
          command: "review",
          args: "Review PR",
          source: {
            type: "github",
            prNumber: 555,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        await executeJob(job);

        expect(mockSpawnSync).not.toHaveBeenCalled();
        expect(mockUpdateJob).toHaveBeenCalledWith("job-10", {
          status: "completed",
          completedAt: expect.any(String),
        });
      });
    });

    describe("plan command", () => {
      it("should execute plan job without worktree", async () => {
        const job: GuardianJob = {
          id: "job-11",
          command: "plan",
          args: "Plan feature",
          source: {
            type: "github",
            issueNumber: 666,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        await executeJob(job);

        expect(mockSpawnSync).not.toHaveBeenCalled();
        expect(mockUpdateJob).toHaveBeenCalledWith("job-11", {
          status: "completed",
          completedAt: expect.any(String),
        });
      });
    });

    describe("unknown command", () => {
      it("should fail on unknown command", async () => {
        const job: GuardianJob = {
          id: "job-12",
          command: "invalid-command",
          args: "Test",
          source: {
            type: "manual",
            userId: "user-123",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-12", {
          status: "failed",
          completedAt: expect.any(String),
          error: expect.stringContaining("Unknown command"),
        });
      });
    });

    describe("error handling", () => {
      it("should handle unexpected errors gracefully", async () => {
        const job: GuardianJob = {
          id: "job-13",
          command: "triage",
          args: "Test",
          source: {
            type: "github",
            issueNumber: 123,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAnalyzeIssue.mockImplementation(() => {
          throw new Error("Analysis failed");
        });

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-13", {
          status: "failed",
          completedAt: expect.any(String),
          error: "Analysis failed",
        });
      });

      it("should handle non-Error exceptions", async () => {
        const job: GuardianJob = {
          id: "job-14",
          command: "triage",
          args: "Test",
          source: {
            type: "github",
            issueNumber: 123,
            repo: "owner/repo",
          },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        };

        mockAnalyzeIssue.mockImplementation(() => {
          throw "String error";
        });

        await executeJob(job);

        expect(mockUpdateJob).toHaveBeenCalledWith("job-14", {
          status: "failed",
          completedAt: expect.any(String),
          error: "String error",
        });
      });
    });
  });

  describe("processQueue", () => {
    it("should process all pending jobs", async () => {
      const jobs: GuardianJob[] = [
        {
          id: "job-1",
          command: "triage",
          args: "Job 1",
          source: { type: "manual", userId: "user-1" },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "job-2",
          command: "investigate",
          args: "Job 2",
          source: { type: "manual", userId: "user-2" },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockGetPendingJobs.mockReturnValue(jobs);

      await processQueue();

      expect(mockGetPendingJobs).toHaveBeenCalled();
      expect(mockUpdateJob).toHaveBeenCalledTimes(4); // 2 jobs × 2 updates each
    });

    it("should handle empty queue", async () => {
      mockGetPendingJobs.mockReturnValue([]);

      await processQueue();

      expect(mockGetPendingJobs).toHaveBeenCalled();
      expect(mockUpdateJob).not.toHaveBeenCalled();
    });

    it("should process jobs sequentially", async () => {
      const executionOrder: string[] = [];

      const jobs: GuardianJob[] = [
        {
          id: "job-a",
          command: "triage",
          args: "Job A",
          source: { type: "manual", userId: "user-1" },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "job-b",
          command: "investigate",
          args: "Job B",
          source: { type: "manual", userId: "user-2" },
          status: "pending",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ];

      mockGetPendingJobs.mockReturnValue(jobs);
      mockUpdateJob.mockImplementation((jobId: string) => {
        executionOrder.push(jobId);
      });

      await processQueue();

      // Each job gets updated twice (running, completed)
      expect(executionOrder).toEqual(["job-a", "job-a", "job-b", "job-b"]);
    });
  });
});
