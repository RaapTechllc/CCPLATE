/**
 * Tests for Harness State module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadHarnessState,
  saveHarnessState,
  generateRunId,
  generateVariantId,
  updateVariantStatus,
  completeHarnessRun,
  setSelectedVariant,
  getHarnessRun,
  getHarnessStatePath,
  getHarnessDir,
  type HarnessState,
  type HarnessRun,
  type VariantState,
} from "../../../../src/lib/guardian/harness/harness-state";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;

describe("Harness State", () => {
  const rootDir = "/test/root";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getHarnessStatePath", () => {
    it("should return correct path", () => {
      const path = getHarnessStatePath(rootDir);
      expect(path).toBe("/test/root/memory/harness-state.json");
    });
  });

  describe("getHarnessDir", () => {
    it("should return correct directory", () => {
      const dir = getHarnessDir(rootDir);
      expect(dir).toBe("/test/root/memory/harness");
    });
  });

  describe("loadHarnessState", () => {
    it("should return empty state when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const state = loadHarnessState(rootDir);

      expect(state).toEqual({ history: [] });
    });

    it("should load state from file", () => {
      const savedState: HarnessState = {
        activeRun: {
          id: "harness-123",
          goal: "Test goal",
          baseBranch: "main",
          variants: [],
          createdAt: "2024-01-01T00:00:00Z",
          maxMinutes: 30,
          maxIterations: 5,
        },
        history: [],
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(savedState));

      const state = loadHarnessState(rootDir);

      expect(state).toEqual(savedState);
    });

    it("should return empty state on JSON parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json{");

      const state = loadHarnessState(rootDir);

      expect(state).toEqual({ history: [] });
    });
  });

  describe("saveHarnessState", () => {
    it("should save state to file", () => {
      const state: HarnessState = {
        activeRun: {
          id: "harness-456",
          goal: "Test save",
          baseBranch: "main",
          variants: [],
          createdAt: "2024-01-01T00:00:00Z",
          maxMinutes: 30,
          maxIterations: 5,
        },
        history: [],
      };

      saveHarnessState(rootDir, state);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(savedContent).toContain('"id": "harness-456"');
    });

    it("should create directory if it doesn't exist", () => {
      mockExistsSync.mockReturnValue(false);

      const state: HarnessState = { history: [] };

      saveHarnessState(rootDir, state);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should not create directory if it exists", () => {
      mockExistsSync.mockReturnValue(true);

      const state: HarnessState = { history: [] };

      saveHarnessState(rootDir, state);

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("generateRunId", () => {
    it("should generate unique run ID", () => {
      const id1 = generateRunId();
      const id2 = generateRunId();

      expect(id1).toMatch(/^harness-[a-z0-9]+-[a-z0-9]{4}$/);
      expect(id2).toMatch(/^harness-[a-z0-9]+-[a-z0-9]{4}$/);
      expect(id1).not.toBe(id2);
    });

    it("should include timestamp in ID", () => {
      const id = generateRunId();
      expect(id).toContain("harness-");
    });
  });

  describe("generateVariantId", () => {
    it("should generate ID from variant name", () => {
      const id = generateVariantId("Test Variant", 0);
      expect(id).toBe("test-variant");
    });

    it("should replace invalid characters with dashes", () => {
      const id = generateVariantId("Test@Variant#123!", 0);
      expect(id).toBe("test-variant-123-");
    });

    it("should truncate to 32 characters", () => {
      const longName = "a".repeat(50);
      const id = generateVariantId(longName, 0);
      expect(id.length).toBe(32);
    });

    it("should use index when name is empty", () => {
      const id1 = generateVariantId("", 0);
      const id2 = generateVariantId("", 1);
      
      expect(id1).toBe("variant-1");
      expect(id2).toBe("variant-2");
    });
  });

  describe("updateVariantStatus", () => {
    it("should update variant in active run", () => {
      const variant: VariantState = {
        id: "variant-1",
        name: "Test",
        worktreePath: "/path",
        branch: "main",
        status: "pending",
      };

      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [variant],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      updateVariantStatus(rootDir, "harness-123", "variant-1", {
        status: "completed",
        exitCode: 0,
      });

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.activeRun.variants[0].status).toBe("completed");
      expect(savedState.activeRun.variants[0].exitCode).toBe(0);
    });

    it("should do nothing if run ID doesn't match", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      updateVariantStatus(rootDir, "harness-999", "variant-1", {
        status: "completed",
      });

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should do nothing if variant not found", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      updateVariantStatus(rootDir, "harness-123", "variant-999", {
        status: "completed",
      });

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should do nothing if no active run", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ history: [] }));

      updateVariantStatus(rootDir, "harness-123", "variant-1", {
        status: "completed",
      });

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe("completeHarnessRun", () => {
    it("should move active run to history", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      completeHarnessRun(rootDir, "harness-123");

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.activeRun).toBeUndefined();
      expect(savedState.history).toHaveLength(1);
      expect(savedState.history[0].id).toBe("harness-123");
      expect(savedState.history[0].completedAt).toBeDefined();
    });

    it("should do nothing if run ID doesn't match", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      completeHarnessRun(rootDir, "harness-999");

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("should do nothing if no active run", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ history: [] }));

      completeHarnessRun(rootDir, "harness-123");

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe("setSelectedVariant", () => {
    it("should set selected variant in active run", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      setSelectedVariant(rootDir, "harness-123", "variant-1");

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.activeRun.selectedVariant).toBe("variant-1");
    });

    it("should set selected variant in history", () => {
      const historyRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        completedAt: "2024-01-01T01:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ history: [historyRun] })
      );

      setSelectedVariant(rootDir, "harness-123", "variant-2");

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );
      expect(savedState.history[0].selectedVariant).toBe("variant-2");
    });

    it("should do nothing if run not found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ history: [] }));

      setSelectedVariant(rootDir, "harness-999", "variant-1");

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe("getHarnessRun", () => {
    it("should return active run when no ID specified", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      const run = getHarnessRun(rootDir);

      expect(run).toEqual(activeRun);
    });

    it("should return last history run when no active run", () => {
      const historyRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        completedAt: "2024-01-01T01:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ history: [historyRun] })
      );

      const run = getHarnessRun(rootDir);

      expect(run).toEqual(historyRun);
    });

    it("should return undefined when no runs", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ history: [] }));

      const run = getHarnessRun(rootDir);

      expect(run).toBeUndefined();
    });

    it("should return active run by ID", () => {
      const activeRun: HarnessRun = {
        id: "harness-123",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ activeRun, history: [] })
      );

      const run = getHarnessRun(rootDir, "harness-123");

      expect(run).toEqual(activeRun);
    });

    it("should return history run by ID", () => {
      const historyRun: HarnessRun = {
        id: "harness-456",
        goal: "Test",
        baseBranch: "main",
        variants: [],
        createdAt: "2024-01-01T00:00:00Z",
        completedAt: "2024-01-01T01:00:00Z",
        maxMinutes: 30,
        maxIterations: 5,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ history: [historyRun] })
      );

      const run = getHarnessRun(rootDir, "harness-456");

      expect(run).toEqual(historyRun);
    });

    it("should return undefined when ID not found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ history: [] }));

      const run = getHarnessRun(rootDir, "harness-999");

      expect(run).toBeUndefined();
    });
  });
});
