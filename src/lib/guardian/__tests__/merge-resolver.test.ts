import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConflictedFiles, applyResolution } from "../merge-resolver";
import * as child_process from "child_process";
import * as fs from "fs";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

vi.mock("fs", async () => {
  const actual = await vi.importActual("fs") as any;
  return {
    ...actual,
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => "conflict content"),
  };
});

describe("merge-resolver security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(child_process.spawnSync).mockReturnValue({ status: 0, stdout: "" } as any);
  });

  describe("getConflictedFiles", () => {
    it("should handle filenames with shell metacharacters safely", () => {
      const maliciousFile = "'; touch pwned; '";
      vi.mocked(child_process.spawnSync).mockReturnValue({
        status: 0,
        stdout: maliciousFile + "\n",
      } as any);

      const files = getConflictedFiles("/tmp");

      expect(files).toContain(maliciousFile);
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        "git",
        ["diff", "--name-only", "--diff-filter=U"],
        expect.objectContaining({ shell: false })
      );
    });
  });

  describe("applyResolution", () => {
    it("should use safe execution (spawnSync) for git add", () => {
      const maliciousFile = "'; touch pwned; '";
      const rootDir = "/tmp";

      applyResolution(maliciousFile, "resolution content", rootDir);

      // Should NOT use execSync anymore
      expect(child_process.execSync).not.toHaveBeenCalled();

      // Should use spawnSync with argument array
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        "git",
        ["add", maliciousFile],
        expect.objectContaining({ shell: false })
      );
    });

    it("should throw error if git add fails", () => {
      const file = "test.ts";
      const rootDir = "/tmp";
      vi.mocked(child_process.spawnSync).mockReturnValue({
        status: 1,
        stderr: "permission denied",
      } as any);

      expect(() => applyResolution(file, "content", rootDir)).toThrow(/Failed to stage resolved file/);
    });
  });
});
