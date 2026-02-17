/**
 * Tests for HITL Capture module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  captureHITLCheckpoint,
  formatCheckpointSummary,
  quickCapture,
  getVercelPreviewUrl,
  deployVercelPreview,
  type CaptureResult,
} from "../../../src/lib/guardian/hitl-capture";
import type { PhaseDefinition } from "../../../src/lib/guardian/tiers/beginner";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock child_process
vi.mock("child_process", () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

import { existsSync, mkdirSync } from "fs";
import { execSync, spawnSync } from "child_process";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const mockExecSync = execSync as ReturnType<typeof vi.fn>;
const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;

describe("HITL Capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("captureHITLCheckpoint", () => {
    const mockPhase: PhaseDefinition = {
      id: "foundation",
      name: "Foundation",
      emoji: "🏗️",
      description: "Test phase",
      duration: 2,
      complexity: 2,
      deliverables: [],
      hitlCheckpoint: {
        prompt: "Test checkpoint",
        demoUrl: "http://localhost:3000",
        screenshotPaths: ["/login"],
        metrics: [
          {
            name: "Build success",
            command: "npm run build",
            target: "pass",
          },
        ],
        criticalPathsToVerify: ["Login works"],
      },
    };

    it("should create screenshots directory if missing", async () => {
      mockExistsSync.mockReturnValue(false);

      await captureHITLCheckpoint(mockPhase);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("screenshots"),
        { recursive: true }
      );
    });

    it("should not recreate existing screenshots directory", async () => {
      mockExistsSync.mockReturnValue(true);

      await captureHITLCheckpoint(mockPhase);

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });

    it("should capture screenshots when paths provided", async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({ status: 0, stdout: "", stderr: "" });

      const result = await captureHITLCheckpoint(mockPhase);

      expect(result.screenshotPaths).toBeDefined();
      expect(mockSpawnSync).toHaveBeenCalled();
    });

    it("should collect metrics when provided", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("Build successful ✓");

      const result = await captureHITLCheckpoint(mockPhase);

      expect(result.metrics).toHaveLength(1);
      expect(result.metrics[0].name).toBe("Build success");
      expect(result.metrics[0].passed).toBe(true);
    });

    it("should set preview URL from checkpoint", async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await captureHITLCheckpoint(mockPhase);

      expect(result.previewUrl).toBe("http://localhost:3000");
    });

    it("should use base URL if no demo URL provided", async () => {
      const phaseNoDemoUrl: PhaseDefinition = {
        ...mockPhase,
        hitlCheckpoint: {
          ...mockPhase.hitlCheckpoint,
          demoUrl: undefined,
        },
      };

      mockExistsSync.mockReturnValue(true);

      const result = await captureHITLCheckpoint(
        phaseNoDemoUrl,
        "http://custom:4000"
      );

      expect(result.previewUrl).toBe("http://custom:4000");
    });

    it("should record errors for failed metrics", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error("Build failed");
      });

      const result = await captureHITLCheckpoint(mockPhase);

      expect(result.metrics[0].passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("metric(s) did not meet target");
    });

    it("should handle phase without screenshots", async () => {
      const phaseNoScreenshots: PhaseDefinition = {
        ...mockPhase,
        hitlCheckpoint: {
          ...mockPhase.hitlCheckpoint,
          screenshotPaths: undefined,
        },
      };

      mockExistsSync.mockReturnValue(true);

      const result = await captureHITLCheckpoint(phaseNoScreenshots);

      expect(result.screenshotPaths).toEqual([]);
    });

    it("should handle phase without metrics", async () => {
      const phaseNoMetrics: PhaseDefinition = {
        ...mockPhase,
        hitlCheckpoint: {
          ...mockPhase.hitlCheckpoint,
          metrics: undefined,
        },
      };

      mockExistsSync.mockReturnValue(true);

      const result = await captureHITLCheckpoint(phaseNoMetrics);

      expect(result.metrics).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("should set deploy URL if provided", async () => {
      const phaseWithDeploy: PhaseDefinition = {
        ...mockPhase,
        hitlCheckpoint: {
          ...mockPhase.hitlCheckpoint,
          deployUrl: "https://app.vercel.app",
        },
      };

      mockExistsSync.mockReturnValue(true);

      const result = await captureHITLCheckpoint(phaseWithDeploy);

      expect(result.deployUrl).toBe("https://app.vercel.app");
    });
  });

  describe("metric evaluation", () => {
    const buildMetric = {
      name: "Build time",
      command: "npm run build",
      target: "<30s",
    };

    it("should parse time metrics correctly", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("Build completed in 15.3s");

      const phase: PhaseDefinition = {
        id: "test",
        name: "Test",
        emoji: "🧪",
        description: "Test",
        duration: 1,
        complexity: 1,
        deliverables: [],
        hitlCheckpoint: {
          prompt: "Test",
          metrics: [buildMetric],
        },
      };

      const result = await captureHITLCheckpoint(phase);

      expect(result.metrics[0].actual).toContain("15.3");
      expect(result.metrics[0].passed).toBe(true);
    });

    it("should handle error count metrics", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("0 errors found ✓");

      const phase: PhaseDefinition = {
        id: "test",
        name: "Test",
        emoji: "🧪",
        description: "Test",
        duration: 1,
        complexity: 1,
        deliverables: [],
        hitlCheckpoint: {
          prompt: "Test",
          metrics: [
            {
              name: "Lint errors",
              command: "npm run lint",
              target: "0",
            },
          ],
        },
      };

      const result = await captureHITLCheckpoint(phase);

      expect(result.metrics[0].actual).toBe("0");
      expect(result.metrics[0].passed).toBe(true);
    });

    it("should handle pass/fail metrics", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("All tests passed ✓");

      const phase: PhaseDefinition = {
        id: "test",
        name: "Test",
        emoji: "🧪",
        description: "Test",
        duration: 1,
        complexity: 1,
        deliverables: [],
        hitlCheckpoint: {
          prompt: "Test",
          metrics: [
            {
              name: "Tests",
              command: "npm test",
              target: "pass",
            },
          ],
        },
      };

      const result = await captureHITLCheckpoint(phase);

      expect(result.metrics[0].passed).toBe(true);
    });

    it("should handle percentage metrics", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("Coverage: 85%");

      const phase: PhaseDefinition = {
        id: "test",
        name: "Test",
        emoji: "🧪",
        description: "Test",
        duration: 1,
        complexity: 1,
        deliverables: [],
        hitlCheckpoint: {
          prompt: "Test",
          metrics: [
            {
              name: "Coverage",
              command: "npm run coverage",
              target: ">80",
            },
          ],
        },
      };

      const result = await captureHITLCheckpoint(phase);

      expect(result.metrics[0].actual).toBe("85");
      expect(result.metrics[0].passed).toBe(true);
    });

    it("should handle comparison operators", async () => {
      mockExistsSync.mockReturnValue(true);
      mockExecSync.mockReturnValue("Score: 95");

      const phase: PhaseDefinition = {
        id: "test",
        name: "Test",
        emoji: "🧪",
        description: "Test",
        duration: 1,
        complexity: 1,
        deliverables: [],
        hitlCheckpoint: {
          prompt: "Test",
          metrics: [
            {
              name: "Score",
              command: "npm run score",
              target: ">=90",
            },
          ],
        },
      };

      const result = await captureHITLCheckpoint(phase);

      expect(result.metrics[0].passed).toBe(true);
    });
  });

  describe("formatCheckpointSummary", () => {
    const mockPhase: PhaseDefinition = {
      id: "foundation",
      name: "Foundation",
      emoji: "🏗️",
      description: "Test phase",
      duration: 2,
      complexity: 2,
      deliverables: [],
      hitlCheckpoint: {
        prompt: "Review the foundation",
        demoUrl: "http://localhost:3000",
        criticalPathsToVerify: ["Login", "Signup"],
      },
    };

    it("should format checkpoint with all sections", () => {
      const capture: CaptureResult = {
        success: true,
        screenshotPaths: ["/tmp/screenshot.png"],
        previewUrl: "http://localhost:3000",
        deployUrl: "https://app.vercel.app",
        metrics: [
          {
            name: "Build",
            target: "pass",
            actual: "pass",
            passed: true,
            command: "npm run build",
          },
        ],
        errors: [],
      };

      const summary = formatCheckpointSummary(mockPhase, capture);

      expect(summary).toContain("HITL Checkpoint: Foundation");
      expect(summary).toContain("Review the foundation");
      expect(summary).toContain("Preview: http://localhost:3000");
      expect(summary).toContain("Deploy: https://app.vercel.app");
      expect(summary).toContain("Screenshots captured:");
      expect(summary).toContain("/tmp/screenshot.png");
      expect(summary).toContain("Metrics:");
      expect(summary).toContain("✅ Build");
      expect(summary).toContain("Critical paths to verify:");
      expect(summary).toContain("□ Login");
      expect(summary).toContain("□ Signup");
    });

    it("should show failed metrics", () => {
      const capture: CaptureResult = {
        success: false,
        screenshotPaths: [],
        metrics: [
          {
            name: "Build",
            target: "pass",
            actual: "fail",
            passed: false,
            command: "npm run build",
          },
        ],
        errors: [],
      };

      const summary = formatCheckpointSummary(mockPhase, capture);

      expect(summary).toContain("❌ Build");
    });

    it("should show errors section", () => {
      const capture: CaptureResult = {
        success: false,
        screenshotPaths: [],
        metrics: [],
        errors: ["Build failed", "Tests failed"],
      };

      const summary = formatCheckpointSummary(mockPhase, capture);

      expect(summary).toContain("Issues detected:");
      expect(summary).toContain("Build failed");
      expect(summary).toContain("Tests failed");
    });

    it("should omit empty sections", () => {
      const capture: CaptureResult = {
        success: true,
        screenshotPaths: [],
        metrics: [],
        errors: [],
      };

      const summary = formatCheckpointSummary(mockPhase, capture);

      expect(summary).not.toContain("Screenshots captured:");
      expect(summary).not.toContain("Metrics:");
      expect(summary).not.toContain("Issues detected:");
    });
  });

  describe("quickCapture", () => {
    it("should create screenshots directory if missing", async () => {
      mockExistsSync.mockReturnValue(false);
      mockSpawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "" });

      await quickCapture("http://localhost:3000", "test");

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("screenshots"),
        { recursive: true }
      );
    });

    it("should return filepath on successful capture", async () => {
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);
      mockSpawnSync.mockReturnValue({ status: 0, stdout: "", stderr: "" });

      const result = await quickCapture("http://localhost:3000", "test");

      expect(result).toMatch(/screenshots\/test-\d+\.png$/);
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        expect.arrayContaining(["playwright", "screenshot"]),
        expect.any(Object)
      );
    });

    it("should return null on failure", async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "Error" });

      const result = await quickCapture("http://localhost:3000", "test");

      expect(result).toBeNull();
    });

    it("should include timestamp in filename", async () => {
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);
      mockSpawnSync.mockReturnValue({ status: 0, stdout: "", stderr: "" });

      const result = await quickCapture("http://localhost:3000", "mypage");

      expect(result).toContain("mypage-");
      expect(result).toMatch(/\d+\.png$/);
    });
  });

  describe("getVercelPreviewUrl", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return URL from environment variable", async () => {
      process.env.VERCEL_URL = "my-app.vercel.app";

      const url = await getVercelPreviewUrl();

      expect(url).toBe("https://my-app.vercel.app");
    });

    it("should query vercel CLI if no env var", async () => {
      delete process.env.VERCEL_URL;
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: JSON.stringify({ url: "https://cli-app.vercel.app" }),
        stderr: "",
      });

      const url = await getVercelPreviewUrl();

      expect(url).toBe("https://cli-app.vercel.app");
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        ["vercel", "inspect", "--json"],
        expect.any(Object)
      );
    });

    it("should return null if no deployment found", async () => {
      delete process.env.VERCEL_URL;
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: "",
        stderr: "No deployment",
      });

      const url = await getVercelPreviewUrl();

      expect(url).toBeNull();
    });

    it("should handle JSON parse errors", async () => {
      delete process.env.VERCEL_URL;
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "invalid json",
        stderr: "",
      });

      const url = await getVercelPreviewUrl();

      expect(url).toBeNull();
    });
  });

  describe("deployVercelPreview", () => {
    it("should deploy and return URL", async () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: "Deployed to https://my-app.vercel.app",
        stderr: "",
      });

      const url = await deployVercelPreview();

      expect(url).toBe("https://my-app.vercel.app");
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "npx",
        ["vercel", "--yes"],
        expect.objectContaining({ timeout: 120000 })
      );
    });

    it("should return null on deployment failure", async () => {
      mockSpawnSync.mockReturnValue({
        status: 1,
        stdout: "",
        stderr: "Deployment failed",
      });

      const url = await deployVercelPreview();

      expect(url).toBeNull();
    });

    it("should extract URL from output", async () => {
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: `
Deploying...
✓ Production: https://production-app.vercel.app
✓ Preview: https://preview-abc123.vercel.app
        `,
        stderr: "",
      });

      const url = await deployVercelPreview();

      expect(url).toMatch(/https:\/\/.*\.vercel\.app/);
    });

    it("should handle timeout errors", async () => {
      mockSpawnSync.mockImplementation(() => {
        throw new Error("Timeout");
      });

      const url = await deployVercelPreview();

      expect(url).toBeNull();
    });
  });
});
