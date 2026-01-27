/**
 * Tests for Error Recovery module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  initializePatternDB,
  loadPatternDB,
  savePatternDB,
  categorizeError,
  matchError,
  attemptRecovery,
  recordAttempt,
  recordOutcome,
  learnPattern,
  getDBStats,
  getSuccessRate,
  formatRecoveryResult,
  type ErrorPatternDB,
  type ErrorPattern,
  type FixStrategy,
  type RecoveryResult,
} from "../../../src/lib/guardian/error-recovery";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ""),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;

describe("Error Recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initializePatternDB", () => {
    it("should create DB with correct structure", () => {
      const db = initializePatternDB();
      
      expect(db).toHaveProperty("version");
      expect(db).toHaveProperty("lastUpdated");
      expect(db).toHaveProperty("patterns");
      expect(db).toHaveProperty("recentAttempts");
      expect(Array.isArray(db.patterns)).toBe(true);
      expect(Array.isArray(db.recentAttempts)).toBe(true);
    });

    it("should include COMMON_ERROR_PATTERNS", () => {
      const db = initializePatternDB();
      
      expect(db.patterns.some(p => p.id === "missingImport")).toBe(true);
      expect(db.patterns.some(p => p.id === "typeError")).toBe(true);
      expect(db.patterns.some(p => p.id === "hydrationMismatch")).toBe(true);
    });

    it("should include additional Next.js/Convex patterns", () => {
      const db = initializePatternDB();
      
      expect(db.patterns.some(p => p.id === "useClientDirective")).toBe(true);
      expect(db.patterns.some(p => p.id === "convexQueryError")).toBe(true);
      expect(db.patterns.some(p => p.id === "envVarMissing")).toBe(true);
    });

    it("should have strategies for each pattern", () => {
      const db = initializePatternDB();
      
      for (const pattern of db.patterns) {
        expect(pattern.strategies.length).toBeGreaterThan(0);
        for (const strategy of pattern.strategies) {
          expect(strategy).toHaveProperty("id");
          expect(strategy).toHaveProperty("description");
          expect(strategy).toHaveProperty("attempts");
          expect(strategy).toHaveProperty("successes");
        }
      }
    });
  });

  describe("loadPatternDB", () => {
    it("should create new DB if file doesn't exist", () => {
      mockExistsSync.mockReturnValue(false);
      
      const db = loadPatternDB("/test");
      
      expect(db).toHaveProperty("patterns");
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should load existing DB from disk", () => {
      const existingDB: ErrorPatternDB = {
        version: "1.0.0",
        lastUpdated: "2026-01-26T12:00:00.000Z",
        patterns: [{
          id: "custom",
          name: "Custom Pattern",
          category: "typescript",
          regex: "custom error",
          regexFlags: "i",
          description: "Custom fix",
          confidence: 0.9,
          strategies: [],
          occurrences: 5,
          examples: [],
          contextHints: [],
        }],
        recentAttempts: [],
      };
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(existingDB));
      
      const db = loadPatternDB("/test");
      
      expect(db.patterns[0].id).toBe("custom");
      expect(db.patterns[0].occurrences).toBe(5);
    });

    it("should reinitialize on corrupt file", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("{ invalid json");
      
      const db = loadPatternDB("/test");
      
      expect(db).toHaveProperty("patterns");
      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("categorizeError", () => {
    it("should categorize TypeScript errors", () => {
      expect(categorizeError("error TS2322: Type 'string' is not assignable")).toBe("typescript");
      expect(categorizeError("Type 'number' is not assignable to type 'string'")).toBe("typescript");
    });

    it("should categorize lint errors", () => {
      expect(categorizeError("ESLint: no-unused-vars")).toBe("lint");
      expect(categorizeError("Prettier formatting error")).toBe("lint");
    });

    it("should categorize build errors", () => {
      expect(categorizeError("Build failed: Module not found")).toBe("build");
      expect(categorizeError("Cannot find module 'test'")).toBe("build");
    });

    it("should categorize runtime errors", () => {
      expect(categorizeError("TypeError: Cannot read property of null")).toBe("runtime");
      expect(categorizeError("Uncaught ReferenceError: x is not defined")).toBe("runtime");
    });

    it("should categorize test errors", () => {
      expect(categorizeError("Test failed: expected 1 to equal 2")).toBe("test");
      expect(categorizeError("Vitest test runner error")).toBe("test");
    });

    it("should categorize database errors", () => {
      expect(categorizeError("Prisma: Query engine error")).toBe("database");
      expect(categorizeError("Convex schema error")).toBe("database");
    });

    it("should categorize auth errors", () => {
      expect(categorizeError("Unauthenticated: No session found")).toBe("auth");
      expect(categorizeError("Unauthorized access denied")).toBe("auth");
    });

    it("should categorize network errors", () => {
      expect(categorizeError("ECONNREFUSED: Connection refused")).toBe("network");
      expect(categorizeError("CORS blocked request")).toBe("network");
    });

    it("should return unknown for unrecognized errors", () => {
      expect(categorizeError("Some random error")).toBe("unknown");
    });
  });

  describe("matchError", () => {
    it("should match known error patterns", () => {
      const db = initializePatternDB();
      
      const match = matchError("Cannot find module 'lodash'", db);
      
      expect(match).not.toBeNull();
      expect(match?.patternId).toBe("missingImport");
      expect(match?.capturedGroups).toContain("lodash");
    });

    it("should return null for unknown errors", () => {
      const db = initializePatternDB();
      
      const match = matchError("Some completely unknown error xyz123", db);
      
      expect(match).toBeNull();
    });

    it("should select best strategy based on success rate", () => {
      const db = initializePatternDB();
      
      // Add a strategy with high success rate
      const pattern = db.patterns.find(p => p.id === "missingImport");
      if (pattern) {
        pattern.strategies.push({
          id: "missingImport-better",
          description: "Better fix",
          attempts: 10,
          successes: 9,
          partials: 0,
          failures: 1,
          avgFixTimeMs: 1000,
        });
      }
      
      const match = matchError("Cannot find module 'test'", db);
      
      expect(match?.bestStrategy?.id).toBe("missingImport-better");
    });

    it("should capture regex groups", () => {
      const db = initializePatternDB();
      
      const match = matchError("Type 'string' is not assignable to type 'number'", db);
      
      expect(match?.capturedGroups).toBeDefined();
      expect(match?.capturedGroups[0]).toBe("string");
    });
  });

  describe("getSuccessRate", () => {
    it("should return 0.5 for no attempts", () => {
      const strategy: FixStrategy = {
        id: "test",
        description: "Test",
        attempts: 0,
        successes: 0,
        partials: 0,
        failures: 0,
        avgFixTimeMs: 0,
      };
      
      expect(getSuccessRate(strategy)).toBe(0.5);
    });

    it("should calculate correct success rate", () => {
      const strategy: FixStrategy = {
        id: "test",
        description: "Test",
        attempts: 10,
        successes: 8,
        partials: 0,
        failures: 2,
        avgFixTimeMs: 0,
      };
      
      expect(getSuccessRate(strategy)).toBe(0.8);
    });

    it("should weight partial successes at 0.5", () => {
      const strategy: FixStrategy = {
        id: "test",
        description: "Test",
        attempts: 10,
        successes: 4,
        partials: 4,
        failures: 2,
        avgFixTimeMs: 0,
      };
      
      // (4 + 4*0.5) / 10 = 0.6
      expect(getSuccessRate(strategy)).toBe(0.6);
    });
  });

  describe("attemptRecovery", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it("should match known errors and return suggestion", () => {
      const result = attemptRecovery("/test", "Cannot find module 'react'");
      
      expect(result.matched).toBe(true);
      expect(result.pattern?.patternId).toBe("missingImport");
      expect(result.suggestion).toBeDefined();
      expect(result.escalate).toBe(false);
    });

    it("should escalate unknown errors", () => {
      const result = attemptRecovery("/test", "Unknown error xyz789");
      
      expect(result.matched).toBe(false);
      expect(result.escalate).toBe(true);
      expect(result.reason).toContain("No matching pattern");
    });

    it("should escalate after max retries", () => {
      const result = attemptRecovery("/test", "Cannot find module 'test'", {
        previousAttempts: 3,
      });
      
      expect(result.matched).toBe(true);
      expect(result.escalate).toBe(true);
      expect(result.reason).toContain("Max retries");
    });

    it("should include file context in recording", () => {
      attemptRecovery("/test", "Type error in test.ts", {
        file: "src/test.ts",
        line: 42,
      });
      
      // Should have called writeFileSync to save attempt
      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("recordOutcome", () => {
    it("should update strategy stats on success", () => {
      // Setup DB with an attempt
      const db = initializePatternDB();
      db.recentAttempts.push({
        patternId: "missingImport",
        strategyId: "missingImport-default",
        error: "Cannot find module 'test'",
        startTime: new Date(Date.now() - 1000).toISOString(),
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(db));
      
      recordOutcome("/test", "missingImport", "missingImport-default", "success", "npm install test");
      
      expect(mockWriteFileSync).toHaveBeenCalled();
      const savedDB = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      const strategy = savedDB.patterns
        .find((p: ErrorPattern) => p.id === "missingImport")?.strategies
        .find((s: FixStrategy) => s.id === "missingImport-default");
      
      expect(strategy.successes).toBe(1);
      expect(strategy.attempts).toBe(1);
    });

    it("should update strategy stats on failure", () => {
      const db = initializePatternDB();
      db.recentAttempts.push({
        patternId: "missingImport",
        strategyId: "missingImport-default",
        error: "Cannot find module 'test'",
        startTime: new Date(Date.now() - 1000).toISOString(),
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(db));
      
      recordOutcome("/test", "missingImport", "missingImport-default", "failure");
      
      const savedDB = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
      const strategy = savedDB.patterns
        .find((p: ErrorPattern) => p.id === "missingImport")?.strategies
        .find((s: FixStrategy) => s.id === "missingImport-default");
      
      expect(strategy.failures).toBe(1);
    });
  });

  describe("learnPattern", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it("should create new pattern", () => {
      const pattern = learnPattern(
        "/test",
        "Custom Error",
        "custom error message",
        "Apply custom fix",
        "runtime",
      );
      
      expect(pattern.id).toBe("customerror");
      expect(pattern.name).toBe("Custom Error");
      expect(pattern.category).toBe("runtime");
      expect(pattern.strategies.length).toBe(1);
      expect(pattern.strategies[0].successes).toBe(1);
    });

    it("should add strategy to existing pattern", () => {
      const db = initializePatternDB();
      // Add an existing pattern with the lowercase id we'll try to add
      db.patterns.push({
        id: "custompattern",
        name: "Custom Pattern",
        category: "build",
        regex: "custom error",
        regexFlags: "i",
        description: "Original fix",
        confidence: 0.8,
        strategies: [{
          id: "custompattern-default",
          description: "Original fix",
          attempts: 5,
          successes: 3,
          partials: 1,
          failures: 1,
          avgFixTimeMs: 2000,
        }],
        occurrences: 5,
        examples: [],
        contextHints: [],
      });
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(db));
      
      const pattern = learnPattern(
        "/test",
        "Custom Pattern",
        "custom error",
        "Alternative fix approach",
      );
      
      // Should have added a strategy, not a new pattern
      expect(pattern.id).toBe("custompattern");
      expect(pattern.strategies.length).toBe(2);
    });
  });

  describe("getDBStats", () => {
    it("should return correct statistics", () => {
      const db = initializePatternDB();
      
      // Add some data
      db.patterns[0].occurrences = 10;
      db.patterns[0].strategies[0].attempts = 5;
      db.patterns[0].strategies[0].successes = 4;
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(db));
      
      const stats = getDBStats("/test");
      
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.totalStrategies).toBeGreaterThan(0);
      expect(stats.topPatterns.length).toBeGreaterThan(0);
    });

    it("should identify top patterns by occurrence", () => {
      const db = initializePatternDB();
      db.patterns[0].occurrences = 100;
      db.patterns[1].occurrences = 50;
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(db));
      
      const stats = getDBStats("/test");
      
      expect(stats.topPatterns[0].occurrences).toBe(100);
      expect(stats.topPatterns[1].occurrences).toBe(50);
    });
  });

  describe("formatRecoveryResult", () => {
    it("should format matched result", () => {
      const result: RecoveryResult = {
        matched: true,
        pattern: {
          patternId: "missingImport",
          patternName: "Missing Import",
          category: "build",
          confidence: 0.9,
          capturedGroups: ["lodash"],
        },
        strategy: {
          id: "missingImport-default",
          description: "npm install $1",
          attempts: 10,
          successes: 9,
          partials: 0,
          failures: 1,
          avgFixTimeMs: 2000,
        },
        suggestion: "npm install lodash",
        escalate: false,
      };
      
      const formatted = formatRecoveryResult(result);
      
      expect(formatted).toContain("Missing Import");
      expect(formatted).toContain("build");
      expect(formatted).toContain("90%"); // Confidence
      expect(formatted).toContain("npm install lodash");
      expect(formatted).toContain("Success Rate");
    });

    it("should format unmatched result", () => {
      const result: RecoveryResult = {
        matched: false,
        suggestion: "Unknown error type",
        escalate: true,
        reason: "No matching pattern",
      };
      
      const formatted = formatRecoveryResult(result);
      
      expect(formatted).toContain("No Matching Pattern");
      expect(formatted).toContain("Escalation Required");
    });

    it("should include command when present", () => {
      const result: RecoveryResult = {
        matched: true,
        pattern: {
          patternId: "test",
          patternName: "Test",
          category: "build",
          confidence: 0.8,
          capturedGroups: [],
        },
        strategy: {
          id: "test-default",
          description: "Run command",
          command: "npx convex dev",
          attempts: 5,
          successes: 4,
          partials: 0,
          failures: 1,
          avgFixTimeMs: 3000,
        },
        suggestion: "Run command",
        escalate: false,
      };
      
      const formatted = formatRecoveryResult(result);
      
      expect(formatted).toContain("Command");
      expect(formatted).toContain("npx convex dev");
    });

    it("should include code transform when present", () => {
      const result: RecoveryResult = {
        matched: true,
        pattern: {
          patternId: "test",
          patternName: "Test",
          category: "build",
          confidence: 0.8,
          capturedGroups: [],
        },
        strategy: {
          id: "test-default",
          description: "Add directive",
          codeTransform: "'use client';",
          attempts: 5,
          successes: 4,
          partials: 0,
          failures: 1,
          avgFixTimeMs: 1000,
        },
        suggestion: "Add directive",
        escalate: false,
      };
      
      const formatted = formatRecoveryResult(result);
      
      expect(formatted).toContain("Code Transform");
      expect(formatted).toContain("'use client'");
    });
  });
});
