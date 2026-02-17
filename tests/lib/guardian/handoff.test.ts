/**
 * Tests for Handoff module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createHandoff,
  hasHandoff,
  loadHandoff,
  getHandoffDetectionMessage,
  clearHandoff,
  formatHandoff,
  type HandoffState,
  type TaskState,
  type HandoffReason,
} from "../../../src/lib/guardian/handoff";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockRenameSync = renameSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockExecSync = execSync as ReturnType<typeof vi.fn>;

describe("Handoff", () => {
  const rootDir = "/test/project";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    mockExistsSync.mockReturnValue(false);
    mockExecSync.mockReturnValue("main\n");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createHandoff", () => {
    beforeEach(() => {
      // Mock git commands
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
        if (cmd.includes("rev-parse --short HEAD")) return "abc123\n";
        if (cmd.includes("git diff --name-only")) return "src/app.tsx\nsrc/api.ts\n";
        return "";
      });
    });

    it("should create handoff files successfully", () => {
      const result = createHandoff(rootDir, {
        reason: "manual",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("Handoff created");
      expect(result.paths).toBeDefined();
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2); // MD + JSON
    });

    it("should create memory directory if it doesn't exist", () => {
      mockExistsSync.mockReturnValue(false);

      createHandoff(rootDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should include metadata in handoff", () => {
      createHandoff(rootDir, { reason: "context_critical" });

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      expect(jsonCall).toBeDefined();

      const state = JSON.parse(jsonCall![1] as string) as HandoffState;
      expect(state.metadata.reason).toBe("context_critical");
      expect(state.metadata.createdAt).toBeDefined();
      expect(state.metadata.branch).toBe("main");
      expect(state.metadata.commit).toBe("abc123");
    });

    it("should accept custom current task", () => {
      const task: TaskState = {
        description: "Implement user auth",
        status: "in_progress",
        remainingSteps: ["Add JWT", "Test login"],
      };

      createHandoff(rootDir, { currentTask: task });

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.currentTask).toEqual(task);
    });

    it("should accept custom next actions", () => {
      const actions = ["Run tests", "Deploy to staging"];

      createHandoff(rootDir, { nextActions: actions });

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.nextActions).toEqual(actions);
    });

    it("should accept custom critical files", () => {
      const files = [
        { path: "src/auth.ts", reason: "Security change" },
        { path: "prisma/schema.prisma", reason: "Schema migration" },
      ];

      createHandoff(rootDir, { criticalFiles: files });

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.criticalFiles).toEqual(files);
    });

    it("should accept custom decisions", () => {
      const decisions = [
        { description: "Use PostgreSQL", timestamp: "2024-01-01T10:00:00Z" },
      ];

      createHandoff(rootDir, { decisions });

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.recentDecisions).toEqual(decisions);
    });

    it("should archive existing handoff before creating new one", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return (path as string).includes("HANDOFF.md");
      });

      createHandoff(rootDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("handoff-archive"),
        { recursive: true }
      );
      expect(mockRenameSync).toHaveBeenCalled();
    });

    it("should handle write errors gracefully", () => {
      mockWriteFileSync.mockImplementationOnce(() => {
        throw new Error("Write failed");
      });

      const result = createHandoff(rootDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to create handoff");
    });

    it("should default to manual reason", () => {
      createHandoff(rootDir);

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.metadata.reason).toBe("manual");
    });

    it("should handle different handoff reasons", () => {
      const reasons: HandoffReason[] = [
        "manual",
        "context_critical",
        "context_forced",
        "session_end",
        "user_request",
      ];

      for (const reason of reasons) {
        vi.clearAllMocks();
        createHandoff(rootDir, { reason });

        const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
          call => (call[0] as string).endsWith(".json")
        );
        const state = JSON.parse(jsonCall![1] as string) as HandoffState;

        expect(state.metadata.reason).toBe(reason);
      }
    });

    it("should load workflow state if available", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return (path as string).includes("workflow-state.json");
      });

      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          context_pressure: 0.75,
          session_id: "test-session-123",
          files_changed: 3,
        })
      );

      createHandoff(rootDir);

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.metadata.contextPressure).toBe(0.75);
      expect(state.metadata.sessionId).toBe("test-session-123");
    });

    it("should extract critical files from git changes", () => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd.includes("git diff --name-only")) {
          return "src/auth.ts\ndb/schema.sql\nREADME.md\n";
        }
        if (cmd.includes("rev-parse --abbrev-ref HEAD")) return "main\n";
        if (cmd.includes("rev-parse --short HEAD")) return "abc123\n";
        return "";
      });

      createHandoff(rootDir);

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.criticalFiles.length).toBeGreaterThan(0);
      expect(state.criticalFiles[0].path).toBe("src/auth.ts");
      expect(state.criticalFiles[0].reason).toBe("Recently modified");
    });

    it("should handle git command failures gracefully", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Git not found");
      });

      const result = createHandoff(rootDir);

      expect(result.success).toBe(true); // Should still succeed
      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;
      expect(state.metadata.branch).toBe("unknown");
      expect(state.metadata.commit).toBe("unknown");
    });

    it("should generate markdown content", () => {
      createHandoff(rootDir, {
        currentTask: {
          description: "Build auth",
          status: "in_progress",
          remainingSteps: ["Add JWT"],
        },
      });

      const mdCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".md")
      );

      expect(mdCall).toBeDefined();
      const markdown = mdCall![1] as string;
      expect(markdown).toContain("# Session Handoff");
      expect(markdown).toContain("Build auth");
      expect(markdown).toContain("Add JWT");
    });

    it("should include workflow state in handoff", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return (path as string).includes("workflow-state.json");
      });

      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          files_changed: 5,
          current_prp_step: 3,
          total_prp_steps: 10,
          errors_detected: ["error1"],
        })
      );

      createHandoff(rootDir);

      const jsonCall = (mockWriteFileSync.mock.calls as unknown[][]).find(
        call => (call[0] as string).endsWith(".json")
      );
      const state = JSON.parse(jsonCall![1] as string) as HandoffState;

      expect(state.workflowState?.files_changed).toBe(5);
      expect(state.workflowState?.current_prp_step).toBe(3);
    });
  });

  describe("hasHandoff", () => {
    it("should return true when handoff exists", () => {
      mockExistsSync.mockReturnValue(true);

      const result = hasHandoff(rootDir);

      expect(result).toBe(true);
      expect(mockExistsSync).toHaveBeenCalledWith(
        expect.stringContaining("HANDOFF.md")
      );
    });

    it("should return false when handoff does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = hasHandoff(rootDir);

      expect(result).toBe(false);
    });
  });

  describe("loadHandoff", () => {
    it("should load handoff state from JSON", () => {
      const mockState: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "manual",
          contextPressure: 0.5,
          branch: "main",
          commit: "abc123",
        },
        currentTask: {
          description: "Test task",
          status: "in_progress",
          remainingSteps: ["Step 1"],
        },
        recentDecisions: [],
        criticalFiles: [],
        nextActions: ["Action 1"],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      const result = loadHandoff(rootDir);

      expect(result).toEqual(mockState);
    });

    it("should return null when handoff does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadHandoff(rootDir);

      expect(result).toBeNull();
    });

    it("should return null on JSON parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json {");

      const result = loadHandoff(rootDir);

      expect(result).toBeNull();
    });

    it("should handle file read errors", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Read failed");
      });

      const result = loadHandoff(rootDir);

      expect(result).toBeNull();
    });
  });

  describe("getHandoffDetectionMessage", () => {
    it("should return null when no handoff exists", () => {
      mockExistsSync.mockReturnValue(false);

      const message = getHandoffDetectionMessage(rootDir);

      expect(message).toBeNull();
    });

    it("should return basic message when handoff exists but can't load", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid");

      const message = getHandoffDetectionMessage(rootDir);

      expect(message).toContain("HANDOFF DETECTED");
      expect(message).toContain("memory/HANDOFF.md");
    });

    it("should return detailed message with state info", () => {
      const mockState: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "context_critical",
          contextPressure: 0.75,
          branch: "main",
        },
        currentTask: {
          description: "Implement auth",
          status: "in_progress",
          remainingSteps: [],
        },
        recentDecisions: [],
        criticalFiles: [],
        nextActions: [],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      const message = getHandoffDetectionMessage(rootDir);

      expect(message).toContain("HANDOFF DETECTED");
      expect(message).toContain("context_critical");
      expect(message).toContain("75%");
      expect(message).toContain("Implement auth");
    });

    it("should handle handoff without current task", () => {
      const mockState: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "session_end",
          contextPressure: 0.5,
        },
        currentTask: null,
        recentDecisions: [],
        criticalFiles: [],
        nextActions: [],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mockState));

      const message = getHandoffDetectionMessage(rootDir);

      expect(message).toContain("HANDOFF DETECTED");
      expect(message).toContain("session_end");
      expect(message).not.toContain("Task:");
    });
  });

  describe("clearHandoff", () => {
    it("should archive handoff files", () => {
      mockExistsSync.mockImplementation((path: string) => {
        return (path as string).includes("HANDOFF") || (path as string).includes("handoff-state");
      });

      clearHandoff(rootDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("handoff-archive"),
        { recursive: true }
      );
      expect(mockRenameSync).toHaveBeenCalled();
    });

    it("should handle missing handoff files gracefully", () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => clearHandoff(rootDir)).not.toThrow();
    });

    it("should handle rename errors gracefully", () => {
      mockExistsSync.mockReturnValue(true);
      mockRenameSync.mockImplementation(() => {
        throw new Error("Rename failed");
      });

      expect(() => clearHandoff(rootDir)).not.toThrow();
    });
  });

  describe("formatHandoff", () => {
    it("should format basic handoff state", () => {
      const state: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "manual",
          contextPressure: 0.5,
          branch: "main",
        },
        currentTask: null,
        recentDecisions: [],
        criticalFiles: [],
        nextActions: [],
      };

      const output = formatHandoff(state);

      expect(output).toContain("Session Handoff");
      expect(output).toContain("Reason: manual");
      expect(output).toContain("Context: 50%");
      expect(output).toContain("Branch: main");
    });

    it("should include current task", () => {
      const state: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "manual",
          contextPressure: 0.6,
          branch: "main",
        },
        currentTask: {
          description: "Build API",
          status: "in_progress",
          remainingSteps: [],
        },
        recentDecisions: [],
        criticalFiles: [],
        nextActions: [],
      };

      const output = formatHandoff(state);

      expect(output).toContain("Current Task: Build API");
      expect(output).toContain("Status: in_progress");
    });

    it("should include next actions", () => {
      const state: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "manual",
          contextPressure: 0.4,
          branch: "main",
        },
        currentTask: null,
        recentDecisions: [],
        criticalFiles: [],
        nextActions: ["Run tests", "Deploy"],
      };

      const output = formatHandoff(state);

      expect(output).toContain("Next Actions:");
      expect(output).toContain("1. Run tests");
      expect(output).toContain("2. Deploy");
    });

    it("should include critical files", () => {
      const state: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "manual",
          contextPressure: 0.3,
          branch: "main",
        },
        currentTask: null,
        recentDecisions: [],
        criticalFiles: [
          { path: "src/auth.ts", reason: "Security" },
          { path: "db/schema.sql", reason: "Migration" },
        ],
        nextActions: [],
      };

      const output = formatHandoff(state);

      expect(output).toContain("Critical Files:");
      expect(output).toContain("src/auth.ts");
      expect(output).toContain("db/schema.sql");
    });

    it("should format context pressure as percentage", () => {
      const state: HandoffState = {
        metadata: {
          createdAt: "2024-01-01T10:00:00Z",
          reason: "context_critical",
          contextPressure: 0.87,
          branch: "main",
        },
        currentTask: null,
        recentDecisions: [],
        criticalFiles: [],
        nextActions: [],
      };

      const output = formatHandoff(state);

      expect(output).toContain("Context: 87%");
    });

    it("should format timestamp as readable date", () => {
      const state: HandoffState = {
        metadata: {
          createdAt: "2024-01-15T14:30:00Z",
          reason: "session_end",
          contextPressure: 0.2,
          branch: "develop",
        },
        currentTask: null,
        recentDecisions: [],
        criticalFiles: [],
        nextActions: [],
      };

      const output = formatHandoff(state);

      expect(output).toContain("Created:");
      // Date format will vary by locale, just check it's present
      expect(output.match(/Created: .+/)).toBeTruthy();
    });
  });
});
