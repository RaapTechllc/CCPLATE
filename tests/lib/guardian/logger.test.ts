/**
 * Tests for Logger module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLogger,
  parseLogEntries,
  formatLogEntries,
  type LogEntry,
  type LogLevel,
} from "../../../src/lib/guardian/logger";

// Mock fs
vi.mock("fs", () => ({
  appendFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";

const mockAppendFileSync = appendFileSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;

describe("Logger", () => {
  const rootDir = "/test/project";
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    mockExistsSync.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe("createLogger", () => {
    it("should create logger with namespace", () => {
      const logger = createLogger("test.module", rootDir);

      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
    });

    it("should log info messages", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Test message");

      expect(mockAppendFileSync).toHaveBeenCalled();
      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.namespace).toBe("test.module");
      expect(entry.level).toBe("info");
      expect(entry.message).toBe("Test message");
    });

    it("should log with data object", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Test message", { key: "value", count: 42 });

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.data).toEqual({ key: "value", count: 42 });
    });

    it("should omit empty data objects", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Test message", {});

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.data).toBeUndefined();
    });

    it("should log debug messages at info level", () => {
      const logger = createLogger("test.module", rootDir);

      // Debug is below default info level, so it won't be logged to file
      logger.debug("Debug message");

      // But we can still test that debug method exists
      expect(logger.debug).toBeDefined();
    });

    it("should log warning messages", () => {
      const logger = createLogger("test.module", rootDir);

      logger.warn("Warning message");

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.level).toBe("warn");
    });

    it("should log error messages", () => {
      const logger = createLogger("test.module", rootDir);

      logger.error("Error message");

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.level).toBe("error");
    });

    it("should create log directory if missing", () => {
      mockExistsSync.mockReturnValue(false);
      const logger = createLogger("test.module", rootDir);

      logger.info("Test message");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should not recreate existing log directory", () => {
      mockExistsSync.mockReturnValue(true);
      const logger = createLogger("test.module", rootDir);

      logger.info("Test message");

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it("should include timestamp in ISO format", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Test message");

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should handle write errors silently", () => {
      mockAppendFileSync.mockImplementation(() => {
        throw new Error("Write error");
      });

      const logger = createLogger("test.module", rootDir);

      expect(() => logger.info("Test message")).not.toThrow();
    });
  });

  describe("log level filtering", () => {
    it("should skip debug logs at default info level", () => {
      const logger = createLogger("test.module", rootDir);

      logger.debug("Debug message");

      expect(mockAppendFileSync).not.toHaveBeenCalled();
    });

    it("should log info at default info level", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Info message");

      expect(mockAppendFileSync).toHaveBeenCalled();
    });

    it("should log warn at default info level", () => {
      const logger = createLogger("test.module", rootDir);

      logger.warn("Warn message");

      expect(mockAppendFileSync).toHaveBeenCalled();
    });

    it("should log error at all levels", () => {
      const logger = createLogger("test.module", rootDir);

      logger.error("Error message");

      expect(mockAppendFileSync).toHaveBeenCalled();
    });

    it("should support all log level methods", () => {
      const logger = createLogger("test.module", rootDir);

      // All methods should exist
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();

      // At default level, debug is skipped, others logged
      logger.debug("Debug");
      expect(mockAppendFileSync).toHaveBeenCalledTimes(0);

      logger.info("Info");
      expect(mockAppendFileSync).toHaveBeenCalledTimes(1);

      logger.warn("Warn");
      expect(mockAppendFileSync).toHaveBeenCalledTimes(2);

      logger.error("Error");
      expect(mockAppendFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe("parseLogEntries", () => {
    it("should parse log entries from file", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"test","level":"info","message":"Test 1"}
{"timestamp":"2026-01-01T11:00:00.000Z","namespace":"test","level":"warn","message":"Test 2"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const entries = parseLogEntries(rootDir);

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe("Test 2"); // Reversed
      expect(entries[1].message).toBe("Test 1");
    });

    it("should return empty array when log file missing", () => {
      mockExistsSync.mockReturnValue(false);

      const entries = parseLogEntries(rootDir);

      expect(entries).toEqual([]);
    });

    it("should filter by namespace", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"module.a","level":"info","message":"A"}
{"timestamp":"2026-01-01T11:00:00.000Z","namespace":"module.b","level":"info","message":"B"}
{"timestamp":"2026-01-01T12:00:00.000Z","namespace":"module.a.sub","level":"info","message":"A.sub"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const entries = parseLogEntries(rootDir, { namespace: "module.a" });

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe("A.sub");
      expect(entries[1].message).toBe("A");
    });

    it("should filter by log level", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"test","level":"debug","message":"Debug"}
{"timestamp":"2026-01-01T11:00:00.000Z","namespace":"test","level":"info","message":"Info"}
{"timestamp":"2026-01-01T12:00:00.000Z","namespace":"test","level":"warn","message":"Warn"}
{"timestamp":"2026-01-01T13:00:00.000Z","namespace":"test","level":"error","message":"Error"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const entries = parseLogEntries(rootDir, { level: "warn" });

      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe("error");
      expect(entries[1].level).toBe("warn");
    });

    it("should filter by date", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"test","level":"info","message":"Old"}
{"timestamp":"2026-01-02T10:00:00.000Z","namespace":"test","level":"info","message":"New"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const since = new Date("2026-01-02T00:00:00.000Z");
      const entries = parseLogEntries(rootDir, { since });

      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe("New");
    });

    it("should apply limit", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"test","level":"info","message":"1"}
{"timestamp":"2026-01-01T11:00:00.000Z","namespace":"test","level":"info","message":"2"}
{"timestamp":"2026-01-01T12:00:00.000Z","namespace":"test","level":"info","message":"3"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const entries = parseLogEntries(rootDir, { limit: 2 });

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe("3");
      expect(entries[1].message).toBe("2");
    });

    it("should apply offset", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"test","level":"info","message":"1"}
{"timestamp":"2026-01-01T11:00:00.000Z","namespace":"test","level":"info","message":"2"}
{"timestamp":"2026-01-01T12:00:00.000Z","namespace":"test","level":"info","message":"3"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const entries = parseLogEntries(rootDir, { offset: 1 });

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe("2");
      expect(entries[1].message).toBe("1");
    });

    it("should skip malformed log lines", () => {
      const logContent = `{"timestamp":"2026-01-01T10:00:00.000Z","namespace":"test","level":"info","message":"Valid"}
invalid json line
{"timestamp":"2026-01-01T11:00:00.000Z","namespace":"test","level":"info","message":"Also valid"}`;

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(logContent);

      const entries = parseLogEntries(rootDir);

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe("Also valid");
      expect(entries[1].message).toBe("Valid");
    });

    it("should handle empty log file", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("");

      const entries = parseLogEntries(rootDir);

      expect(entries).toEqual([]);
    });
  });

  describe("formatLogEntries", () => {
    it("should format log entries for display", () => {
      const entries: LogEntry[] = [
        {
          timestamp: "2026-01-01T10:15:30.123Z",
          namespace: "test.module",
          level: "info",
          message: "Test message",
        },
      ];

      const formatted = formatLogEntries(entries);

      expect(formatted).toContain("test.module");
      expect(formatted).toContain("Test message");
      expect(formatted).toContain("I"); // Info icon
    });

    it("should show different icons for log levels", () => {
      const entries: LogEntry[] = [
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          namespace: "test",
          level: "debug",
          message: "Debug",
        },
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          namespace: "test",
          level: "info",
          message: "Info",
        },
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          namespace: "test",
          level: "warn",
          message: "Warn",
        },
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          namespace: "test",
          level: "error",
          message: "Error",
        },
      ];

      const formatted = formatLogEntries(entries);

      expect(formatted).toContain("D"); // Debug
      expect(formatted).toContain("I"); // Info
      expect(formatted).toContain("W"); // Warn
      expect(formatted).toContain("E"); // Error
    });

    it("should include data inline for short objects", () => {
      const entries: LogEntry[] = [
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          namespace: "test",
          level: "info",
          message: "Test",
          data: { count: 5 },
        },
      ];

      const formatted = formatLogEntries(entries);

      expect(formatted).toContain('{"count":5}');
      expect(formatted).not.toContain("\n    ");
    });

    it("should put long data on new line", () => {
      const entries: LogEntry[] = [
        {
          timestamp: "2026-01-01T10:00:00.000Z",
          namespace: "test",
          level: "info",
          message: "Test",
          data: {
            veryLongKey1: "value1",
            veryLongKey2: "value2",
            veryLongKey3: "value3",
          },
        },
      ];

      const formatted = formatLogEntries(entries);

      expect(formatted).toContain("\n    ");
    });

    it("should return message for empty entries", () => {
      const formatted = formatLogEntries([]);

      expect(formatted).toBe("No log entries found");
    });

    it("should format timestamp correctly", () => {
      const entries: LogEntry[] = [
        {
          timestamp: "2026-01-01T10:15:30.123456Z",
          namespace: "test",
          level: "info",
          message: "Test",
        },
      ];

      const formatted = formatLogEntries(entries);

      expect(formatted).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/);
    });
  });

  describe("data handling", () => {
    it("should handle complex data objects", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Complex data", {
        nested: { key: "value" },
        array: [1, 2, 3],
        number: 42,
        boolean: true,
        null: null,
      });

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      expect(entry.data.nested).toEqual({ key: "value" });
      expect(entry.data.array).toEqual([1, 2, 3]);
      expect(entry.data.number).toBe(42);
      expect(entry.data.boolean).toBe(true);
    });

    it("should handle undefined values in data", () => {
      const logger = createLogger("test.module", rootDir);

      logger.info("Test", { key: undefined } as any);

      const logLine = mockAppendFileSync.mock.calls[0][1] as string;
      const entry = JSON.parse(logLine.trim());

      // undefined values are omitted in JSON
      expect(entry.data).toEqual({});
    });
  });
});
