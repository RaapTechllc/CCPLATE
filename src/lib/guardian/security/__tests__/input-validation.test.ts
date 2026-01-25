/**
 * Input Validation Tests
 *
 * Security regression tests for the input validation module.
 * These tests ensure that the validation functions correctly reject
 * malicious input and accept valid input.
 */

import { describe, it, expect } from "vitest";
import {
  validatePositiveInteger,
  validateOptionalPositiveInteger,
  validateSafeIdentifier,
  validateGitRef,
  validatePath,
  validateEnum,
  escapeShellArg,
  ValidationError,
} from "../input-validation";

describe("validatePositiveInteger", () => {
  it("accepts valid positive integers", () => {
    expect(validatePositiveInteger(1, "test")).toBe(1);
    expect(validatePositiveInteger(42, "test")).toBe(42);
    expect(validatePositiveInteger(1000000, "test")).toBe(1000000);
  });

  it("accepts valid numeric strings", () => {
    expect(validatePositiveInteger("1", "test")).toBe(1);
    expect(validatePositiveInteger("123", "test")).toBe(123);
  });

  it("rejects zero", () => {
    expect(() => validatePositiveInteger(0, "test")).toThrow(ValidationError);
  });

  it("rejects negative numbers", () => {
    expect(() => validatePositiveInteger(-1, "test")).toThrow(ValidationError);
    expect(() => validatePositiveInteger(-100, "test")).toThrow(ValidationError);
  });

  it("rejects numbers exceeding max value", () => {
    expect(() =>
      validatePositiveInteger(2147483648, "test")
    ).toThrow(ValidationError);
  });

  it("rejects non-numeric values", () => {
    expect(() => validatePositiveInteger("abc", "test")).toThrow(ValidationError);
    expect(() => validatePositiveInteger({}, "test")).toThrow(ValidationError);
    expect(() => validatePositiveInteger([], "test")).toThrow(ValidationError);
  });

  it("rejects null and undefined", () => {
    expect(() => validatePositiveInteger(null, "test")).toThrow(ValidationError);
    expect(() => validatePositiveInteger(undefined, "test")).toThrow(ValidationError);
  });

  it("rejects floats", () => {
    expect(() => validatePositiveInteger(1.5, "test")).toThrow(ValidationError);
  });

  it("rejects NaN and Infinity", () => {
    expect(() => validatePositiveInteger(NaN, "test")).toThrow(ValidationError);
    expect(() => validatePositiveInteger(Infinity, "test")).toThrow(ValidationError);
  });

  it("respects custom max value", () => {
    expect(validatePositiveInteger(100, "test", 200)).toBe(100);
    expect(() => validatePositiveInteger(300, "test", 200)).toThrow(ValidationError);
  });
});

describe("validateOptionalPositiveInteger", () => {
  it("returns undefined for null/undefined", () => {
    expect(validateOptionalPositiveInteger(null, "test")).toBeUndefined();
    expect(validateOptionalPositiveInteger(undefined, "test")).toBeUndefined();
  });

  it("validates when value is present", () => {
    expect(validateOptionalPositiveInteger(42, "test")).toBe(42);
    expect(() => validateOptionalPositiveInteger(-1, "test")).toThrow(ValidationError);
  });
});

describe("validateSafeIdentifier", () => {
  it("accepts valid identifiers", () => {
    expect(validateSafeIdentifier("foo", "test")).toBe("foo");
    expect(validateSafeIdentifier("foo-bar", "test")).toBe("foo-bar");
    expect(validateSafeIdentifier("foo_bar", "test")).toBe("foo_bar");
    expect(validateSafeIdentifier("foo.bar", "test")).toBe("foo.bar");
    expect(validateSafeIdentifier("123abc", "test")).toBe("123abc");
    expect(validateSafeIdentifier("a", "test")).toBe("a");
    expect(validateSafeIdentifier("job-12345", "test")).toBe("job-12345");
  });

  it("rejects identifiers starting with special characters", () => {
    expect(() => validateSafeIdentifier("-foo", "test")).toThrow(ValidationError);
    expect(() => validateSafeIdentifier("_foo", "test")).toThrow(ValidationError);
    expect(() => validateSafeIdentifier(".foo", "test")).toThrow(ValidationError);
  });

  it("rejects uppercase letters", () => {
    expect(() => validateSafeIdentifier("FOO", "test")).toThrow(ValidationError);
    expect(() => validateSafeIdentifier("fooBar", "test")).toThrow(ValidationError);
  });

  it("rejects empty strings", () => {
    expect(() => validateSafeIdentifier("", "test")).toThrow(ValidationError);
  });

  it("rejects identifiers that are too long", () => {
    const longId = "a".repeat(65);
    expect(() => validateSafeIdentifier(longId, "test")).toThrow(ValidationError);
  });

  it("accepts max length identifiers", () => {
    const maxLengthId = "a" + "b".repeat(63);
    expect(validateSafeIdentifier(maxLengthId, "test")).toBe(maxLengthId);
  });
});

describe("validateGitRef", () => {
  it("accepts valid commit hashes", () => {
    expect(validateGitRef("abcdef1", "test", "hash")).toBe("abcdef1");
    expect(
      validateGitRef("abcdef1234567890abcdef1234567890abcdef12", "test", "hash")
    ).toBe("abcdef1234567890abcdef1234567890abcdef12");
  });

  it("accepts valid branch names", () => {
    expect(validateGitRef("main", "test", "branch")).toBe("main");
    expect(validateGitRef("feature/foo-bar", "test", "branch")).toBe("feature/foo-bar");
    expect(validateGitRef("ccplate/my-task", "test", "branch")).toBe("ccplate/my-task");
  });

  it("rejects short hashes for hash type", () => {
    expect(() => validateGitRef("abc", "test", "hash")).toThrow(ValidationError);
  });

  it("rejects hashes with invalid characters", () => {
    expect(() => validateGitRef("abcdefg", "test", "hash")).toThrow(ValidationError);
    expect(() => validateGitRef("ABCDEF1", "test", "hash")).toThrow(ValidationError);
  });

  it("rejects empty refs", () => {
    expect(() => validateGitRef("", "test")).toThrow(ValidationError);
  });
});

describe("validatePath", () => {
  it("accepts valid relative paths", () => {
    expect(validatePath("foo/bar", "test")).toBe("foo/bar");
    expect(validatePath("src/lib/guardian", "test")).toBe("src/lib/guardian");
  });

  it("rejects directory traversal", () => {
    expect(() => validatePath("../foo", "test")).toThrow(ValidationError);
    expect(() => validatePath("foo/../bar", "test")).toThrow(ValidationError);
    expect(() => validatePath("..\\foo", "test")).toThrow(ValidationError);
  });

  it("rejects absolute paths by default", () => {
    expect(() => validatePath("/etc/passwd", "test")).toThrow(ValidationError);
    expect(() => validatePath("C:\\Windows", "test")).toThrow(ValidationError);
  });

  it("allows absolute paths when enabled", () => {
    expect(validatePath("/etc/passwd", "test", { allowAbsolute: true })).toBe(
      "/etc/passwd"
    );
  });

  it("rejects null bytes", () => {
    expect(() => validatePath("foo\0bar", "test")).toThrow(ValidationError);
  });

  it("rejects paths exceeding max length", () => {
    const longPath = "a".repeat(501);
    expect(() => validatePath(longPath, "test")).toThrow(ValidationError);
  });
});

describe("validateEnum", () => {
  const allowedValues = ["a", "b", "c"] as const;

  it("accepts allowed values", () => {
    expect(validateEnum("a", "test", allowedValues)).toBe("a");
    expect(validateEnum("b", "test", allowedValues)).toBe("b");
    expect(validateEnum("c", "test", allowedValues)).toBe("c");
  });

  it("rejects disallowed values", () => {
    expect(() => validateEnum("d", "test", allowedValues)).toThrow(ValidationError);
    expect(() => validateEnum("A", "test", allowedValues)).toThrow(ValidationError);
  });
});

describe("escapeShellArg", () => {
  it("wraps simple strings in single quotes", () => {
    expect(escapeShellArg("foo")).toBe("'foo'");
    expect(escapeShellArg("hello world")).toBe("'hello world'");
  });

  it("escapes single quotes", () => {
    expect(escapeShellArg("it's")).toBe("'it'\\''s'");
    expect(escapeShellArg("'foo'")).toBe("''\\''foo'\\'''");
  });

  it("handles empty strings", () => {
    expect(escapeShellArg("")).toBe("''");
  });

  it("handles strings with special characters", () => {
    expect(escapeShellArg("foo;bar")).toBe("'foo;bar'");
    expect(escapeShellArg("foo|bar")).toBe("'foo|bar'");
    expect(escapeShellArg("foo`whoami`")).toBe("'foo`whoami`'");
    expect(escapeShellArg("$(whoami)")).toBe("'$(whoami)'");
  });
});

describe("ValidationError", () => {
  it("includes field name and value", () => {
    const error = new ValidationError("test message", "testField", "badValue");
    expect(error.message).toBe("test message");
    expect(error.field).toBe("testField");
    expect(error.value).toBe("badValue");
    expect(error.name).toBe("ValidationError");
  });
});
