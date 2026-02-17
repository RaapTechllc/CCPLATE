import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  loadNarratorState,
  saveNarratorState,
  appendActivity,
  narrateToolUse,
  narrateTestResult,
  narrateTaskStart,
  narrateTaskComplete,
  narrateHITLRequest,
  narrateError,
  narrateFixAttempt,
  incrementLoop,
  getCurrentLoop,
  clearActivityLog,
  type ActivityEntry,
  type NarratorState,
} from "../../../src/lib/guardian/activity-narrator";

const TEST_DIR = join(process.cwd(), "test-fixtures", "activity-narrator");

describe("Activity Narrator", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("Narrator State", () => {
    it("should return default state when file doesn't exist", () => {
      const state = loadNarratorState(TEST_DIR);
      
      expect(state.currentLoop).toBe(0);
      expect(state.sessionId).toBeNull();
      expect(state.lastActivity).toBeNull();
    });

    it("should save and load narrator state", () => {
      const state: NarratorState = {
        currentLoop: 5,
        sessionId: "session-123",
        lastActivity: "Writing file",
      };

      saveNarratorState(TEST_DIR, state);
      const loaded = loadNarratorState(TEST_DIR);

      expect(loaded.currentLoop).toBe(5);
      expect(loaded.sessionId).toBe("session-123");
      expect(loaded.lastActivity).toBe("Writing file");
    });

    it("should create memory directory if it doesn't exist", () => {
      const state: NarratorState = {
        currentLoop: 1,
        sessionId: "test",
        lastActivity: null,
      };

      saveNarratorState(TEST_DIR, state);
      
      expect(existsSync(join(TEST_DIR, "memory"))).toBe(true);
    });

    it("should handle corrupted state file", () => {
      const memoryDir = join(TEST_DIR, "memory");
      mkdirSync(memoryDir, { recursive: true });
      writeFileSync(join(memoryDir, "narrator-state.json"), "invalid json{{{");

      const state = loadNarratorState(TEST_DIR);
      
      expect(state.currentLoop).toBe(0);
      expect(state.sessionId).toBeNull();
    });
  });

  describe("Activity Logging", () => {
    it("should create activity file with header if it doesn't exist", () => {
      const entry: ActivityEntry = {
        timestamp: new Date().toISOString(),
        loop: 1,
        status: "start",
        activity: "Starting task",
      };

      appendActivity(TEST_DIR, entry);
      
      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("# Activity Log");
      expect(content).toContain("| Time | Loop | Status | Activity |");
    });

    it("should append activity entries", () => {
      const entry1: ActivityEntry = {
        timestamp: new Date().toISOString(),
        loop: 1,
        status: "start",
        activity: "First activity",
      };

      const entry2: ActivityEntry = {
        timestamp: new Date().toISOString(),
        loop: 1,
        status: "progress",
        activity: "Second activity",
      };

      appendActivity(TEST_DIR, entry1);
      appendActivity(TEST_DIR, entry2);
      
      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("First activity");
      expect(content).toContain("Second activity");
    });

    it("should format activity with worktree tag", () => {
      const entry: ActivityEntry = {
        timestamp: new Date().toISOString(),
        loop: 2,
        status: "progress",
        activity: "Building",
        worktree: "variant-1",
      };

      appendActivity(TEST_DIR, entry);
      
      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("`variant-1`");
    });

    it("should format activity with task info", () => {
      const entry: ActivityEntry = {
        timestamp: new Date().toISOString(),
        loop: 1,
        status: "complete",
        activity: "Task done",
        tasksRemaining: 2,
        totalTasks: 5,
      };

      appendActivity(TEST_DIR, entry);
      
      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("(3/5 tasks)");
    });

    it("should use correct emoji for different statuses", () => {
      const statuses: Array<ActivityEntry["status"]> = [
        "start",
        "progress",
        "error",
        "test_fail",
        "test_pass",
        "complete",
        "hitl",
      ];

      statuses.forEach((status, i) => {
        const entry: ActivityEntry = {
          timestamp: new Date().toISOString(),
          loop: i + 1,
          status,
          activity: `${status} activity`,
        };
        appendActivity(TEST_DIR, entry);
      });

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("🚀"); // start
      expect(content).toContain("⏳"); // progress
      expect(content).toContain("⚠️"); // error
      expect(content).toContain("❌"); // test_fail
      expect(content).toContain("✅"); // test_pass/complete
      expect(content).toContain("🚧"); // hitl
    });

    it("should clear activity log", () => {
      const entry: ActivityEntry = {
        timestamp: new Date().toISOString(),
        loop: 1,
        status: "start",
        activity: "Test",
      };

      appendActivity(TEST_DIR, entry);
      
      let content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("Test");

      clearActivityLog(TEST_DIR);
      
      content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).not.toContain("Test");
      expect(content).toContain("# Activity Log");
    });

    it("should handle clearing non-existent log", () => {
      expect(() => clearActivityLog(TEST_DIR)).not.toThrow();
    });
  });

  describe("Tool Use Narration", () => {
    it("should narrate Write tool", () => {
      narrateToolUse(
        TEST_DIR,
        "Write",
        { path: "/project/src/file.ts" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Writing file**");
      expect(content).toContain("file.ts");
    });

    it("should narrate Edit tool", () => {
      narrateToolUse(
        TEST_DIR,
        "Edit",
        { path: "/project/src/config.json" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Editing file**");
      expect(content).toContain("config.json");
    });

    it("should not narrate Read tool", () => {
      narrateToolUse(
        TEST_DIR,
        "Read",
        { path: "/project/src/file.ts" },
        "session-1"
      );

      const activityPath = join(TEST_DIR, "memory", "ACTIVITY.md");
      expect(existsSync(activityPath)).toBe(false);
    });

    it("should narrate test commands", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "npm run test" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Running tests**");
    });

    it("should narrate playwright test", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "playwright test" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Running tests**");
    });

    it("should narrate git commit", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: 'git commit -m "Update"' },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Committing changes**");
    });

    it("should narrate git push", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "git push origin main" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Pushing changes**");
    });

    it("should narrate build commands", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "npm run build" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Building project**");
    });

    it("should narrate next build", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "next build" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Building project**");
    });

    it("should narrate npm install", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "npm install lodash" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Installing dependencies**");
    });

    it("should not narrate generic bash commands", () => {
      narrateToolUse(
        TEST_DIR,
        "Bash",
        { command: "ls -la" },
        "session-1"
      );

      const activityPath = join(TEST_DIR, "memory", "ACTIVITY.md");
      expect(existsSync(activityPath)).toBe(false);
    });

    it("should not narrate search operations", () => {
      const tools = ["Grep", "glob", "finder"];
      
      tools.forEach(tool => {
        narrateToolUse(TEST_DIR, tool, { query: "test" }, "session-1");
      });

      const activityPath = join(TEST_DIR, "memory", "ACTIVITY.md");
      expect(existsSync(activityPath)).toBe(false);
    });

    it("should detect new session and reset loop", () => {
      narrateToolUse(
        TEST_DIR,
        "Write",
        { path: "/file1.ts" },
        "session-1"
      );

      incrementLoop(TEST_DIR);
      incrementLoop(TEST_DIR);
      
      expect(getCurrentLoop(TEST_DIR)).toBe(3);

      narrateToolUse(
        TEST_DIR,
        "Write",
        { path: "/file2.ts" },
        "session-2"
      );

      expect(getCurrentLoop(TEST_DIR)).toBe(1);
    });

    it("should avoid duplicate consecutive activities", () => {
      narrateToolUse(
        TEST_DIR,
        "Write",
        { path: "/file1.ts" },
        "session-1"
      );

      narrateToolUse(
        TEST_DIR,
        "Write",
        { path: "/file1.ts" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      const matches = content.match(/\*\*Writing file\*\* - file1\.ts/g);
      expect(matches).toHaveLength(1);
    });

    it("should include worktree ID when provided", () => {
      narrateToolUse(
        TEST_DIR,
        "Write",
        { path: "/file.ts" },
        "session-1",
        "variant-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("`variant-1`");
    });

    it("should handle create_file alias for Write", () => {
      narrateToolUse(
        TEST_DIR,
        "create_file",
        { path: "/new-file.ts" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Writing file**");
      expect(content).toContain("new-file.ts");
    });

    it("should handle edit_file alias for Edit", () => {
      narrateToolUse(
        TEST_DIR,
        "edit_file",
        { path: "/existing.ts" },
        "session-1"
      );

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Editing file**");
      expect(content).toContain("existing.ts");
    });
  });

  describe("Test Result Narration", () => {
    it("should narrate passed test", () => {
      narrateTestResult(TEST_DIR, "/tests/auth.test.ts", true);

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Test passed**");
      expect(content).toContain("auth.test.ts");
      expect(content).toContain("✅");
    });

    it("should narrate failed test", () => {
      narrateTestResult(TEST_DIR, "/tests/api.test.ts", false, "Expected 200, got 500");

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Test failed**");
      expect(content).toContain("api.test.ts");
      expect(content).toContain("❌");
      expect(content).toContain("Expected 200");
    });

    it("should truncate long error messages", () => {
      const longError = "a".repeat(100);
      narrateTestResult(TEST_DIR, "/tests/long.test.ts", false, longError);

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      const activityLine = content.split("\n").find(line => line.includes("Test failed"));
      expect(activityLine!.length).toBeLessThan(150);
    });

    it("should update last activity state", () => {
      narrateTestResult(TEST_DIR, "/tests/test.ts", true);
      
      const state = loadNarratorState(TEST_DIR);
      expect(state.lastActivity).toContain("**Test passed**");
    });
  });

  describe("Task Narration", () => {
    it("should narrate task start", () => {
      narrateTaskStart(TEST_DIR, "Implement authentication");

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Started task**");
      expect(content).toContain("Implement authentication");
      expect(content).toContain("🚀");
    });

    it("should narrate task start with worktree", () => {
      narrateTaskStart(TEST_DIR, "Setup database", "worker-1");

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Started task**");
      expect(content).toContain("`worker-1`");
    });

    it("should narrate task complete", () => {
      narrateTaskComplete(TEST_DIR, "Implement login", 3, 5);

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Task complete**");
      expect(content).toContain("Implement login");
      expect(content).toContain("(2/5 tasks)");
      expect(content).toContain("✅");
    });

    it("should show all tasks complete", () => {
      narrateTaskComplete(TEST_DIR, "Final task", 0, 10);

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("(10/10 tasks)");
    });
  });

  describe("HITL Narration", () => {
    it("should narrate HITL request", () => {
      narrateHITLRequest(TEST_DIR, "Review phase 1 completion");

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Awaiting HITL**");
      expect(content).toContain("Review phase 1 completion");
      expect(content).toContain("🚧");
    });

    it("should update last activity", () => {
      narrateHITLRequest(TEST_DIR, "Approve deployment");
      
      const state = loadNarratorState(TEST_DIR);
      expect(state.lastActivity).toContain("**Awaiting HITL**");
    });
  });

  describe("Error Narration", () => {
    it("should narrate errors", () => {
      narrateError(TEST_DIR, "Build failed: module not found");

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Error**");
      expect(content).toContain("Build failed");
      expect(content).toContain("⚠️");
    });

    it("should truncate long error descriptions", () => {
      const longError = "Error: " + "x".repeat(200);
      narrateError(TEST_DIR, longError);

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      const errorLine = content.split("\n").find(line => line.includes("**Error**"));
      expect(errorLine!.length).toBeLessThan(200);
    });
  });

  describe("Fix Attempt Narration", () => {
    it("should narrate fix attempts", () => {
      narrateFixAttempt(TEST_DIR, "Adding missing import");

      const content = readFileSync(join(TEST_DIR, "memory", "ACTIVITY.md"), "utf-8");
      expect(content).toContain("**Fix attempt**");
      expect(content).toContain("Adding missing import");
      expect(content).toContain("⏳");
    });
  });

  describe("Loop Management", () => {
    it("should start at loop 1 or 0", () => {
      // getCurrentLoop returns 1 when state.currentLoop is 0
      const loop = getCurrentLoop(TEST_DIR);
      expect([0, 1]).toContain(loop);
    });

    it("should increment loop", () => {
      expect(incrementLoop(TEST_DIR)).toBe(1);
      expect(getCurrentLoop(TEST_DIR)).toBe(1);
      
      expect(incrementLoop(TEST_DIR)).toBe(2);
      expect(getCurrentLoop(TEST_DIR)).toBe(2);
    });

    it("should persist loop count", () => {
      incrementLoop(TEST_DIR);
      incrementLoop(TEST_DIR);
      
      expect(getCurrentLoop(TEST_DIR)).toBe(2);
    });

    it("should default to 1 when state exists but loop is 0", () => {
      const state: NarratorState = {
        currentLoop: 0,
        sessionId: "test",
        lastActivity: null,
      };
      saveNarratorState(TEST_DIR, state);

      expect(getCurrentLoop(TEST_DIR)).toBe(1);
    });
  });
});
