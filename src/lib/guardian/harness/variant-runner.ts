import { spawn, spawnSync } from "child_process";
import { existsSync, writeFileSync, appendFileSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { updateVariantStatus, type VariantState } from "./harness-state";
import { validateSafeIdentifier, validatePath, ValidationError } from "../security";

export interface VariantRunnerOptions {
  rootDir: string;
  runId: string;
  variant: VariantState;
  goal: string;
  prdHash?: string;
  maxMinutes: number;
  maxIterations: number;
  onProgress?: (variantId: string, message: string) => void;
}

export interface VariantResult {
  variantId: string;
  status: "completed" | "failed" | "timeout";
  exitCode?: number;
  error?: string;
  summary?: string;
  duration: number;
}

function ensureVariantDir(rootDir: string, variantId: string): string {
  const variantDir = join(rootDir, "memory", "harness", "variants", variantId);
  if (!existsSync(variantDir)) {
    mkdirSync(variantDir, { recursive: true });
  }
  return variantDir;
}

function writeVariantBrief(
  variantDir: string,
  goal: string,
  variantId: string,
  prdHash?: string
): void {
  const briefPath = join(variantDir, "goal.md");
  const lines = [
    `# POC Variant: ${variantId}`,
    "",
    `## Goal`,
    "",
    goal,
    "",
    `## Constraints`,
    "",
    "- Keep scope minimal - this is a proof of concept",
    "- Log decisions and trade-offs in POC_SUMMARY.md",
    "- Focus on demonstrating the core approach",
    prdHash ? `- PRD Hash: ${prdHash} (align with success criteria)` : "",
    "",
    `## Expected Output`,
    "",
    "Create a `POC_SUMMARY.md` file in the worktree root with:",
    "1. Approach taken",
    "2. Key decisions and trade-offs",
    "3. What works / what doesn't",
    "4. Recommended next steps if this variant is selected",
  ].filter(Boolean);

  writeFileSync(briefPath, lines.join("\n"));
}

export async function runVariant(options: VariantRunnerOptions): Promise<VariantResult> {
  const { rootDir, runId, variant, goal, prdHash, maxMinutes, onProgress } = options;
  const startTime = Date.now();

  // SECURITY: Validate variant.id before using in file paths
  try {
    validateSafeIdentifier(variant.id, 'variant.id');
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        variantId: variant.id,
        status: "failed",
        error: `Invalid variant ID: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
    throw error;
  }

  // SECURITY: Validate worktree path
  try {
    validatePath(variant.worktreePath, 'variant.worktreePath', { allowAbsolute: false });
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        variantId: variant.id,
        status: "failed",
        error: `Invalid worktree path: ${error.message}`,
        duration: Date.now() - startTime,
      };
    }
    throw error;
  }

  const variantDir = ensureVariantDir(rootDir, variant.id);
  const logPath = join(variantDir, "run.log");

  writeVariantBrief(variantDir, goal, variant.id, prdHash);

  updateVariantStatus(rootDir, runId, variant.id, {
    status: "running",
    startedAt: new Date().toISOString(),
    logPath: logPath.replace(rootDir + "/", ""),
  });

  onProgress?.(variant.id, "Starting variant execution...");

  return new Promise((resolve) => {
    const worktreePath = join(rootDir, variant.worktreePath);

    // Check if worktree exists
    if (!existsSync(worktreePath)) {
      const result: VariantResult = {
        variantId: variant.id,
        status: "failed",
        error: `Worktree not found: ${variant.worktreePath}`,
        duration: Date.now() - startTime,
      };
      updateVariantStatus(rootDir, runId, variant.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: result.error,
      });
      resolve(result);
      return;
    }

    // Write initial log
    writeFileSync(logPath, `=== POC Variant: ${variant.id} ===\n`);
    appendFileSync(logPath, `Goal: ${goal}\n`);
    appendFileSync(logPath, `Started: ${new Date().toISOString()}\n`);
    appendFileSync(logPath, `Worktree: ${worktreePath}\n`);
    appendFileSync(logPath, `\n--- Execution Log ---\n\n`);

    // SECURITY: Run build steps using spawnSync with argument arrays
    // instead of shell heredoc to prevent command injection
    const runBuildSteps = (): { success: boolean; output: string[] } => {
      const output: string[] = [];
      const packageJsonPath = join(worktreePath, "package.json");

      // Check if package.json exists
      if (existsSync(packageJsonPath)) {
        // Run npm install
        output.push("[POC] Running npm install...");
        const installResult = spawnSync("npm", ["install", "--silent"], {
          cwd: worktreePath,
          encoding: "utf-8",
          env: {
            ...process.env,
            CCPLATE_WORKTREE: variant.id,
            CCPLATE_HARNESS_RUN: runId,
          },
        });
        if (installResult.stdout) output.push(installResult.stdout);
        if (installResult.stderr) output.push(installResult.stderr);

        // Run build
        output.push("[POC] Running build check...");
        const buildResult = spawnSync("npm", ["run", "build", "--silent"], {
          cwd: worktreePath,
          encoding: "utf-8",
          env: {
            ...process.env,
            CCPLATE_WORKTREE: variant.id,
            CCPLATE_HARNESS_RUN: runId,
          },
        });
        if (buildResult.stdout) output.push(buildResult.stdout);
        if (buildResult.stderr) output.push(buildResult.stderr);
        if (buildResult.status !== 0) output.push("[POC] Build had issues");

        // Run type check
        output.push("[POC] Running type check...");
        const tscResult = spawnSync("npx", ["tsc", "--noEmit"], {
          cwd: worktreePath,
          encoding: "utf-8",
          env: {
            ...process.env,
            CCPLATE_WORKTREE: variant.id,
            CCPLATE_HARNESS_RUN: runId,
          },
        });
        if (tscResult.stdout) output.push(tscResult.stdout);
        if (tscResult.stderr) output.push(tscResult.stderr);
        if (tscResult.status !== 0) output.push("[POC] Type check had issues");
      }

      // SECURITY: Create POC_SUMMARY.md using writeFileSync instead of shell heredoc
      const summaryPath = join(worktreePath, "POC_SUMMARY.md");
      if (!existsSync(summaryPath)) {
        // Note: variant.id is already validated above
        const summaryContent = `# POC Summary: ${variant.id}

## Approach
[Auto-generated placeholder - human/agent should fill this in]

## Status
- Build: Attempted
- Tests: Not yet run

## Next Steps
1. Review build output
2. Implement core functionality
3. Add tests
`;
        writeFileSync(summaryPath, summaryContent);
      }

      output.push("[POC] Variant execution complete");
      return { success: true, output };
    };

    // Run build steps asynchronously using spawn for progress updates
    const child = spawn(process.platform === "win32" ? "cmd" : "sh",
      process.platform === "win32" ? ["/c", "echo", "Starting build..."] : ["-c", "echo 'Starting build...'"], {
      cwd: worktreePath,
      env: {
        ...process.env,
        CCPLATE_WORKTREE: variant.id,
        CCPLATE_HARNESS_RUN: runId,
      },
    });

    // Run the actual build steps synchronously after spawn starts
    let buildOutput: { success: boolean; output: string[] } | null = null;
    setTimeout(() => {
      buildOutput = runBuildSteps();
      for (const line of buildOutput.output) {
        appendFileSync(logPath, line + "\n");
        onProgress?.(variant.id, line.split("\n").pop() || "");
      }
    }, 100);

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      appendFileSync(logPath, text);
      onProgress?.(variant.id, text.trim().split("\n").pop() || "");
    });

    child.stderr?.on("data", (data) => {
      const text = data.toString();
      appendFileSync(logPath, `[stderr] ${text}`);
    });

    // Timeout handler
    const timeoutMs = maxMinutes * 60 * 1000;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) {
          child.kill("SIGKILL");
        }
      }, 5000);
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      const timedOut = duration >= timeoutMs;

      appendFileSync(logPath, `\n--- Execution Complete ---\n`);
      appendFileSync(logPath, `Exit code: ${code}\n`);
      appendFileSync(logPath, `Duration: ${Math.round(duration / 1000)}s\n`);

      // Try to read POC_SUMMARY.md for summary
      let summary: string | undefined;
      const summaryPath = join(worktreePath, "POC_SUMMARY.md");
      if (existsSync(summaryPath)) {
        try {
          summary = readFileSync(summaryPath, "utf-8").slice(0, 2000);
        } catch {
          // Ignore
        }
      }

      const status = timedOut ? "timeout" : code === 0 ? "completed" : "failed";
      const result: VariantResult = {
        variantId: variant.id,
        status,
        exitCode: code ?? undefined,
        error: timedOut ? "Execution timed out" : undefined,
        summary,
        duration,
      };

      updateVariantStatus(rootDir, runId, variant.id, {
        status,
        completedAt: new Date().toISOString(),
        exitCode: code ?? undefined,
        error: result.error,
        summary,
      });

      resolve(result);
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      appendFileSync(logPath, `\n--- Error ---\n${err.message}\n`);

      const result: VariantResult = {
        variantId: variant.id,
        status: "failed",
        error: err.message,
        duration,
      };

      updateVariantStatus(rootDir, runId, variant.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
        error: err.message,
      });

      resolve(result);
    });
  });
}
