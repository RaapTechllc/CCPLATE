/**
 * Tests for Context Watchdog module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadWatchdogState,
  saveWatchdogState,
  evaluateWatchdog,
  updateWatchdogState,
  shouldBlockWrites,
  getBlockingReason,
  formatWatchdogStatus,
  resetWatchdogState,
  getWatchdogNudge,
  getSeverityEmoji,
  getSeverityColor,
  DEFAULT_WATCHDOG_CONFIG,
  type WatchdogSeverity,
  type WatchdogState,
  type WatchdogConfig,
} from "../../../src/lib/guardian/context-watchdog";

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

describe("Context Watchdog", () => {
  const rootDir = "/test/root";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadWatchdogState", () => {
    it("should return default state when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const state = loadWatchdogState(rootDir);

      expect(state).toEqual({
        severity: "normal",
        contextPressure: 0,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      });
    });

    it("should load state from file when it exists", () => {
      const savedState: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 2,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(savedState));

      const state = loadWatchdogState(rootDir);

      expect(state).toEqual(savedState);
    });

    it("should return default state on JSON parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json{");

      const state = loadWatchdogState(rootDir);

      expect(state).toEqual({
        severity: "normal",
        contextPressure: 0,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      });
    });
  });

  describe("saveWatchdogState", () => {
    it("should save state to file", () => {
      const state: WatchdogState = {
        severity: "orange",
        contextPressure: 0.75,
        blocking: false,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 3,
      };

      saveWatchdogState(rootDir, state);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(savedContent).toContain('"severity": "orange"');
    });

    it("should format JSON with indentation", () => {
      const state: WatchdogState = {
        severity: "normal",
        contextPressure: 0.2,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      };

      saveWatchdogState(rootDir, state);

      const savedContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(savedContent).toContain("  ");
      expect(savedContent).toMatch(/\n/);
    });
  });

  describe("getSeverityEmoji", () => {
    it("should return correct emoji for each severity", () => {
      expect(getSeverityEmoji("normal")).toBe("🟢");
      expect(getSeverityEmoji("warning")).toBe("🟡");
      expect(getSeverityEmoji("orange")).toBe("🟠");
      expect(getSeverityEmoji("critical")).toBe("🔴");
      expect(getSeverityEmoji("force")).toBe("⛔");
    });
  });

  describe("getSeverityColor", () => {
    it("should return ANSI color codes", () => {
      expect(getSeverityColor("normal")).toBe("\x1b[32m");
      expect(getSeverityColor("warning")).toBe("\x1b[33m");
      expect(getSeverityColor("orange")).toBe("\x1b[38;5;208m");
      expect(getSeverityColor("critical")).toBe("\x1b[31m");
      expect(getSeverityColor("force")).toBe("\x1b[35m");
    });
  });

  describe("evaluateWatchdog", () => {
    const config = DEFAULT_WATCHDOG_CONFIG;

    it("should return normal severity for low context pressure", () => {
      const evaluation = evaluateWatchdog(0.3, config);

      expect(evaluation.severity).toBe("normal");
      expect(evaluation.blocking).toBe(false);
      expect(evaluation.shouldAutoHandoff).toBe(false);
      expect(evaluation.message).toContain("30%");
      expect(evaluation.message).toContain("Plenty of room");
    });

    it("should return warning severity at 50% threshold", () => {
      const evaluation = evaluateWatchdog(0.5, config);

      expect(evaluation.severity).toBe("warning");
      expect(evaluation.blocking).toBe(false);
      expect(evaluation.shouldAutoHandoff).toBe(false);
      expect(evaluation.message).toContain("50%");
      expect(evaluation.message).toContain("Doing great");
    });

    it("should return warning for pressure above warning threshold", () => {
      const evaluation = evaluateWatchdog(0.65, config);

      expect(evaluation.severity).toBe("warning");
      expect(evaluation.message).toContain("65%");
    });

    it("should return orange severity at 70% threshold", () => {
      const evaluation = evaluateWatchdog(0.7, config);

      expect(evaluation.severity).toBe("orange");
      expect(evaluation.blocking).toBe(false);
      expect(evaluation.shouldAutoHandoff).toBe(false);
      expect(evaluation.message).toContain("70%");
      expect(evaluation.message).toContain("wrapping up");
      expect(evaluation.suggestion).toContain("handoff");
    });

    it("should return orange for pressure above orange threshold", () => {
      const evaluation = evaluateWatchdog(0.8, config);

      expect(evaluation.severity).toBe("orange");
      expect(evaluation.message).toContain("80%");
    });

    it("should return critical severity at 85% threshold", () => {
      const evaluation = evaluateWatchdog(0.85, config);

      expect(evaluation.severity).toBe("critical");
      expect(evaluation.blocking).toBe(true);
      expect(evaluation.shouldAutoHandoff).toBe(false);
      expect(evaluation.message).toContain("85%");
      expect(evaluation.suggestion).toContain("ccplate handoff create");
    });

    it("should block writes at critical when configured", () => {
      const evaluation = evaluateWatchdog(0.9, config);

      expect(evaluation.severity).toBe("critical");
      expect(evaluation.blocking).toBe(true);
      expect(evaluation.message).toContain("blocked");
    });

    it("should not block writes at critical when disabled", () => {
      const noBlockConfig: WatchdogConfig = {
        ...config,
        blockWritesAtCritical: false,
      };

      const evaluation = evaluateWatchdog(0.9, noBlockConfig);

      expect(evaluation.severity).toBe("critical");
      expect(evaluation.blocking).toBe(false);
    });

    it("should return force severity at 95% threshold", () => {
      const evaluation = evaluateWatchdog(0.95, config);

      expect(evaluation.severity).toBe("force");
      expect(evaluation.blocking).toBe(true);
      expect(evaluation.shouldAutoHandoff).toBe(true);
      expect(evaluation.message).toContain("95%");
      expect(evaluation.message).toContain("Auto-creating");
    });

    it("should always block at force level", () => {
      const noBlockConfig: WatchdogConfig = {
        ...config,
        blockWritesAtCritical: false,
      };

      const evaluation = evaluateWatchdog(0.98, noBlockConfig);

      expect(evaluation.severity).toBe("force");
      expect(evaluation.blocking).toBe(true);
    });

    it("should handle 100% context pressure", () => {
      const evaluation = evaluateWatchdog(1.0, config);

      expect(evaluation.severity).toBe("force");
      expect(evaluation.blocking).toBe(true);
      expect(evaluation.shouldAutoHandoff).toBe(true);
    });

    it("should handle custom thresholds", () => {
      const customConfig: WatchdogConfig = {
        enabled: true,
        thresholds: {
          warning: 0.4,
          orange: 0.6,
          critical: 0.8,
          forceHandoff: 0.9,
        },
        blockWritesAtCritical: true,
      };

      expect(evaluateWatchdog(0.4, customConfig).severity).toBe("warning");
      expect(evaluateWatchdog(0.6, customConfig).severity).toBe("orange");
      expect(evaluateWatchdog(0.8, customConfig).severity).toBe("critical");
      expect(evaluateWatchdog(0.9, customConfig).severity).toBe("force");
    });
  });

  describe("updateWatchdogState", () => {
    it("should update state with new evaluation", () => {
      mockExistsSync.mockReturnValue(false);

      const evaluation = {
        severity: "warning" as WatchdogSeverity,
        blocking: false,
        message: "Warning",
        suggestion: "Test",
        shouldAutoHandoff: false,
      };

      const state = updateWatchdogState(rootDir, 0.55, evaluation);

      expect(state.severity).toBe("warning");
      expect(state.contextPressure).toBe(0.55);
      expect(state.blocking).toBe(false);
      expect(state.lastEscalation).toBeDefined();
      expect(state.escalationCount).toBe(1);
    });

    it("should increment escalation count on severity change", () => {
      const existingState: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 1,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingState));

      const evaluation = {
        severity: "orange" as WatchdogSeverity,
        blocking: false,
        message: "Orange",
        suggestion: "Test",
        shouldAutoHandoff: false,
      };

      const state = updateWatchdogState(rootDir, 0.75, evaluation);

      expect(state.escalationCount).toBe(2);
    });

    it("should not increment escalation count on same severity", () => {
      const existingState: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 1,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingState));

      const evaluation = {
        severity: "warning" as WatchdogSeverity,
        blocking: false,
        message: "Warning",
        suggestion: "Test",
        shouldAutoHandoff: false,
      };

      const state = updateWatchdogState(rootDir, 0.58, evaluation);

      expect(state.escalationCount).toBe(1);
      expect(state.lastEscalation).toBe("2024-01-01T00:00:00Z");
    });

    it("should not increment escalation count when returning to normal", () => {
      const existingState: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 1,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingState));

      const evaluation = {
        severity: "normal" as WatchdogSeverity,
        blocking: false,
        message: "Normal",
        suggestion: "",
        shouldAutoHandoff: false,
      };

      const state = updateWatchdogState(rootDir, 0.3, evaluation);

      expect(state.escalationCount).toBe(1);
    });

    it("should save state after update", () => {
      mockExistsSync.mockReturnValue(false);

      const evaluation = {
        severity: "critical" as WatchdogSeverity,
        blocking: true,
        message: "Critical",
        suggestion: "Handoff",
        shouldAutoHandoff: false,
      };

      updateWatchdogState(rootDir, 0.88, evaluation);

      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("shouldBlockWrites", () => {
    it("should return false when not blocking", () => {
      const state: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      expect(shouldBlockWrites(rootDir)).toBe(false);
    });

    it("should return true when blocking", () => {
      const state: WatchdogState = {
        severity: "critical",
        contextPressure: 0.9,
        blocking: true,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 3,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      expect(shouldBlockWrites(rootDir)).toBe(true);
    });
  });

  describe("getBlockingReason", () => {
    it("should return empty string when not blocking", () => {
      const state: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      expect(getBlockingReason(rootDir)).toBe("");
    });

    it("should return force message at force severity", () => {
      const state: WatchdogState = {
        severity: "force",
        contextPressure: 0.96,
        blocking: true,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 4,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      const reason = getBlockingReason(rootDir);

      expect(reason).toContain("96%");
      expect(reason).toContain("All writes blocked");
      expect(reason).toContain("ccplate handoff create");
    });

    it("should return critical message at critical severity", () => {
      const state: WatchdogState = {
        severity: "critical",
        contextPressure: 0.88,
        blocking: true,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 2,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));

      const reason = getBlockingReason(rootDir);

      expect(reason).toContain("88%");
      expect(reason).toContain("Write operations paused");
    });
  });

  describe("formatWatchdogStatus", () => {
    it("should format basic status", () => {
      const state: WatchdogState = {
        severity: "normal",
        contextPressure: 0.3,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      };

      const status = formatWatchdogStatus(state);

      expect(status).toContain("🟢");
      expect(status).toContain("30%");
      expect(status).toContain("NORMAL");
      expect(status).toContain("Blocking: No");
    });

    it("should include last escalation time", () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const state: WatchdogState = {
        severity: "warning",
        contextPressure: 0.55,
        blocking: false,
        lastEscalation: oneHourAgo,
        escalationCount: 1,
      };

      const status = formatWatchdogStatus(state);

      expect(status).toContain("Last escalation:");
      expect(status).toMatch(/\d+m ago/);
    });

    it("should include escalation count", () => {
      const state: WatchdogState = {
        severity: "orange",
        contextPressure: 0.75,
        blocking: false,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 3,
      };

      const status = formatWatchdogStatus(state);

      expect(status).toContain("Total escalations: 3");
    });

    it("should show blocking status", () => {
      const state: WatchdogState = {
        severity: "critical",
        contextPressure: 0.9,
        blocking: true,
        lastEscalation: "2024-01-01T00:00:00Z",
        escalationCount: 4,
      };

      const status = formatWatchdogStatus(state);

      expect(status).toContain("Blocking: Yes");
      expect(status).toContain("🔴");
    });
  });

  describe("resetWatchdogState", () => {
    it("should reset state to defaults", () => {
      resetWatchdogState(rootDir);

      expect(mockWriteFileSync).toHaveBeenCalled();

      const savedState = JSON.parse(
        mockWriteFileSync.mock.calls[0][1] as string
      );

      expect(savedState).toEqual({
        severity: "normal",
        contextPressure: 0,
        blocking: false,
        lastEscalation: null,
        escalationCount: 0,
      });
    });
  });

  describe("getWatchdogNudge", () => {
    it("should return null for normal severity", () => {
      const nudge = getWatchdogNudge("normal", 0.3, false);
      expect(nudge).toBeNull();
    });

    it("should return warning nudge", () => {
      const nudge = getWatchdogNudge("warning", 0.55, false);

      expect(nudge).toContain("🟡");
      expect(nudge).toContain("55%");
      expect(nudge).toContain("Doing great");
    });

    it("should return orange nudge", () => {
      const nudge = getWatchdogNudge("orange", 0.75, false);

      expect(nudge).toContain("🟠");
      expect(nudge).toContain("75%");
      expect(nudge).toContain("wrapping up");
    });

    it("should return critical nudge with blocking", () => {
      const nudge = getWatchdogNudge("critical", 0.9, true);

      expect(nudge).toContain("🔴");
      expect(nudge).toContain("90%");
      expect(nudge).toContain("blocked");
      expect(nudge).toContain("ccplate handoff create");
    });

    it("should return critical nudge without blocking", () => {
      const nudge = getWatchdogNudge("critical", 0.88, false);

      expect(nudge).toContain("🔴");
      expect(nudge).toContain("88%");
      expect(nudge).toContain("handoff soon");
    });

    it("should return force nudge", () => {
      const nudge = getWatchdogNudge("force", 0.96, true);

      expect(nudge).toContain("⛔");
      expect(nudge).toContain("96%");
      expect(nudge).toContain("Auto-creating");
    });
  });

  describe("DEFAULT_WATCHDOG_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_WATCHDOG_CONFIG).toEqual({
        enabled: true,
        thresholds: {
          warning: 0.5,
          orange: 0.7,
          critical: 0.85,
          forceHandoff: 0.95,
        },
        blockWritesAtCritical: true,
      });
    });
  });
});
