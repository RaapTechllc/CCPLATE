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
  validateRepoName,
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

describe("validateRepoName", () => {
  it("accepts valid repository names", () => {
    expect(validateRepoName("owner/repo", "test")).toBe("owner/repo");
    expect(validateRepoName("my-org/my_repo", "test")).toBe("my-org/my_repo");
    expect(validateRepoName("user/repo.js", "test")).toBe("user/repo.js");
    expect(validateRepoName("123/456", "test")).toBe("123/456");
  });

  it("rejects names without a slash", () => {
    expect(() => validateRepoName("repo", "test")).toThrow(ValidationError);
  });

  it("rejects names with directory traversal segments", () => {
    expect(() => validateRepoName("../hidden", "test")).toThrow(ValidationError);
    expect(() => validateRepoName("owner/../hidden", "test")).toThrow(ValidationError);
    expect(() => validateRepoName("./repo", "test")).toThrow(ValidationError);
    expect(() => validateRepoName("owner/.", "test")).toThrow(ValidationError);
  });

  it("rejects names with invalid characters", () => {
    expect(() => validateRepoName("owner/repo!", "test")).toThrow(ValidationError);
    expect(() => validateRepoName("owner/repo$", "test")).toThrow(ValidationError);
  });

  it("rejects null and undefined", () => {
    expect(() => validateRepoName(null, "test")).toThrow(ValidationError);
    expect(() => validateRepoName(undefined, "test")).toThrow(ValidationError);
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

describe("validateRepoName", () => {
  it("accepts valid repository names", () => {
    expect(validateRepoName("owner/repo")).toBe("owner/repo");
    expect(validateRepoName("owner-name/repo.name")).toBe("owner-name/repo.name");
    expect(validateRepoName("owner/repo_name")).toBe("owner/repo_name");
    expect(validateRepoName("123owner/123repo")).toBe("123owner/123repo");
  });

  it("rejects repository names without owner", () => {
    expect(() => validateRepoName("repo")).toThrow(ValidationError);
  });

  it("rejects repository names with multiple slashes", () => {
    expect(() => validateRepoName("owner/repo/extra")).toThrow(ValidationError);
  });

  it("rejects repository names starting with hyphen", () => {
    expect(() => validateRepoName("-owner/repo")).toThrow(ValidationError);
  });

  it("rejects repository names ending with hyphen in owner", () => {
    expect(() => validateRepoName("owner-/repo")).toThrow(ValidationError);
  });

  it("rejects repository names with shell characters", () => {
    expect(() => validateRepoName("owner/repo;rm -rf")).toThrow(ValidationError);
  });

  it("rejects empty repository names", () => {
    expect(() => validateRepoName("")).toThrow(ValidationError);
  });

  it("rejects repository names that are too long", () => {
    const longRepo = "a".repeat(50) + "/" + "b".repeat(51);
    expect(() => validateRepoName(longRepo)).toThrow(ValidationError);
  });

  it("rejects '.' as repository name", () => {
    expect(() => validateRepoName("owner/.")).toThrow(ValidationError);
  });

  it("rejects '..' as repository name", () => {
    expect(() => validateRepoName("owner/..")).toThrow(ValidationError);
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
