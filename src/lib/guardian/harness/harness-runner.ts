import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import pMap from "p-map";
import {
  loadHarnessState,
  saveHarnessState,
  generateRunId,
  generateVariantId,
  completeHarnessRun,
  getHarnessRun,
  setSelectedVariant,
  type HarnessRun,
  type VariantState,
} from "./harness-state";
import { runVariant, type VariantResult } from "./variant-runner";
import { saveHarnessReport, printVariantComparison } from "./report";
import { loadPRD } from "../prd";
import { createLogger } from "../logger";

const log = createLogger("guardian.harness");

export interface HarnessOptions {
  rootDir: string;
  goal: string;
  variants: number;
  names?: string[];
  baseBranch?: string;
  maxMinutes?: number;
  maxIterations?: number;
  parallel?: boolean;         // Run variants concurrently
  maxConcurrent?: number;     // Max simultaneous variants (default: 3)
  requirePRD?: boolean;
  dryRun?: boolean;
  keepWorktrees?: boolean;
}

function exec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8" }).trim();
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(execError.stderr || execError.message || "Command failed");
  }
}

function getCurrentBranch(rootDir: string): string {
  try {
    return exec("git rev-parse --abbrev-ref HEAD", rootDir);
  } catch {
    return "main";
  }
}

function createWorktreeForVariant(
  rootDir: string,
  variantId: string,
  baseBranch: string,
  branchPrefix: string
): { path: string; branch: string } {
  const worktreePath = `.worktrees/${variantId}`;
  const fullPath = join(rootDir, worktreePath);
  const branchName = `${branchPrefix}${variantId}`;

  // Ensure .worktrees directory exists
  const worktreesDir = join(rootDir, ".worktrees");
  if (!existsSync(worktreesDir)) {
    mkdirSync(worktreesDir, { recursive: true });
  }

  // Remove existing worktree if it exists
  if (existsSync(fullPath)) {
    try {
      exec(`git worktree remove "${fullPath}" --force`, rootDir);
    } catch {
      // Try manual cleanup
      rmSync(fullPath, { recursive: true, force: true });
    }
  }

  // Delete branch if it exists
  try {
    exec(`git branch -D "${branchName}"`, rootDir);
  } catch {
    // Branch doesn't exist, that's fine
  }

  // Create worktree with new branch from base
  exec(`git worktree add "${fullPath}" -b "${branchName}" "${baseBranch}"`, rootDir);

  return { path: worktreePath, branch: branchName };
}

function removeWorktree(rootDir: string, worktreePath: string, branch: string): void {
  const fullPath = join(rootDir, worktreePath);
  
  try {
    exec(`git worktree remove "${fullPath}" --force`, rootDir);
  } catch {
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true });
    }
  }

  try {
    exec(`git branch -D "${branch}"`, rootDir);
  } catch {
    // Branch might already be deleted
  }
}

export async function startHarnessRun(options: HarnessOptions): Promise<HarnessRun> {
  const {
    rootDir,
    goal,
    variants: variantCount,
    names,
    baseBranch,
    maxMinutes = 30,
    maxIterations = 20,
    parallel = false,
    maxConcurrent = 3,
    requirePRD = true,
    dryRun = false,
  } = options;

  // Check for existing active run
  const state = loadHarnessState(rootDir);
  if (state.activeRun) {
    throw new Error(
      `Active harness run exists: ${state.activeRun.id}. ` +
      `Complete or cleanup before starting a new run.`
    );
  }

  // Check PRD requirement
  let prdHash: string | undefined;
  if (requirePRD) {
    const prd = loadPRD(rootDir);
    if (!prd) {
      throw new Error(
        "No PRD found. Run 'ccplate init' first, or use --no-prd to skip this check."
      );
    }
    prdHash = prd.metadata.hash;
  }

  const currentBranch = baseBranch || getCurrentBranch(rootDir);
  const runId = generateRunId();
  const branchPrefix = `poc/${runId}/`;

  // Generate variant names
  const variantNames = names || Array.from({ length: variantCount }, (_, i) => `variant-${i + 1}`);
  
  if (variantNames.length !== variantCount && !names) {
    throw new Error(`Mismatch: ${variantCount} variants requested but ${variantNames.length} names provided`);
  }

  const actualCount = names ? names.length : variantCount;

  console.log("\n" + "═".repeat(60));
  console.log("  🧪 CCPLATE POC Harness");
  console.log("═".repeat(60) + "\n");
  console.log(`Run ID: ${runId}`);
  console.log(`Goal: ${goal}`);
  console.log(`Base Branch: ${currentBranch}`);
  console.log(`Variants: ${actualCount}`);
  console.log(`Max Time: ${maxMinutes} minutes per variant`);
  if (prdHash) console.log(`PRD Hash: ${prdHash}`);
  console.log();

  if (dryRun) {
    console.log("🔍 Dry run - would create:");
    for (let i = 0; i < actualCount; i++) {
      const name = variantNames[i];
      const id = generateVariantId(name, i);
      console.log(`  - Worktree: .worktrees/${id}`);
      console.log(`    Branch: ${branchPrefix}${id}`);
    }
    throw new Error("Dry run complete - no changes made");
  }

  // Create variants
  const variants: VariantState[] = [];
  
  console.log("📦 Creating worktrees...\n");
  
  for (let i = 0; i < actualCount; i++) {
    const name = variantNames[i];
    const id = generateVariantId(name, i);
    
    console.log(`  Creating ${name}...`);
    
    try {
      const { path, branch } = createWorktreeForVariant(rootDir, id, currentBranch, branchPrefix);
      
      variants.push({
        id,
        name,
        worktreePath: path,
        branch,
        status: "pending",
      });
      
      console.log(`    ✓ ${path} (${branch})`);
    } catch (error) {
      console.error(`    ✗ Failed: ${(error as Error).message}`);
      
      // Cleanup already created worktrees
      for (const v of variants) {
        try {
          removeWorktree(rootDir, v.worktreePath, v.branch);
        } catch {
          // Ignore cleanup errors
        }
      }
      
      throw new Error(`Failed to create worktree for ${name}: ${(error as Error).message}`);
    }
  }

  // Create harness run
  const run: HarnessRun = {
    id: runId,
    goal,
    prdHash,
    baseBranch: currentBranch,
    variants,
    createdAt: new Date().toISOString(),
    maxMinutes,
    maxIterations,
  };

  // Save state
  state.activeRun = run;
  saveHarnessState(rootDir, state);

  console.log("\n✓ Harness run created");
  console.log(`  State: memory/harness-state.json`);

  // Run variants
  console.log("\n🚀 Running variants...\n");

  const runSingleVariant = async (variant: VariantState): Promise<VariantResult> => {
    log.info("Starting variant", { variantId: variant.id, name: variant.name });
    console.log(`\n▶ Running ${variant.name}...`);

    const result = await runVariant({
      rootDir,
      runId,
      variant,
      goal,
      prdHash,
      maxMinutes,
      maxIterations,
      onProgress: (id, msg) => {
        if (msg) console.log(`  [${id}] ${msg}`);
      },
    });

    const emoji = result.status === "completed" ? "✓" : result.status === "timeout" ? "⏱" : "✗";
    console.log(`  ${emoji} ${variant.name}: ${result.status}`);

    log.info("Variant completed", {
      variantId: variant.id,
      status: result.status,
      duration: result.duration,
    });

    return result;
  };

  let results: VariantResult[];

  if (parallel) {
    // Parallel execution with concurrency control
    const concurrency = Math.min(maxConcurrent, variants.length);
    console.log(`  Mode: Parallel (max ${concurrency} concurrent)\n`);

    log.info("Starting parallel execution", {
      variantCount: variants.length,
      concurrency,
    });

    results = await pMap(variants, runSingleVariant, { concurrency });
  } else {
    // Sequential execution
    console.log(`  Mode: Sequential\n`);

    log.info("Starting sequential execution", {
      variantCount: variants.length,
    });

    results = [];
    for (const variant of variants) {
      results.push(await runSingleVariant(variant));
    }
  }

  // Complete run
  completeHarnessRun(rootDir, runId);

  // Generate report
  const updatedRun = getHarnessRun(rootDir, runId);
  if (updatedRun) {
    const reportPath = saveHarnessReport(rootDir, updatedRun);
    console.log(`\n📋 Report: ${reportPath}`);
    printVariantComparison(updatedRun);
  }

  return getHarnessRun(rootDir, runId)!;
}

export async function pickVariant(
  rootDir: string,
  variantId: string,
  runId?: string,
  mergeStrategy: "merge" | "rebase" | "cherry-pick" = "merge"
): Promise<void> {
  const run = getHarnessRun(rootDir, runId);
  
  if (!run) {
    throw new Error(runId ? `Run not found: ${runId}` : "No harness run found");
  }

  const variant = run.variants.find((v) => v.id === variantId);
  if (!variant) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  if (variant.status !== "completed") {
    console.warn(`⚠️  Warning: Variant ${variantId} has status '${variant.status}'`);
  }

  console.log(`\n🏆 Selecting variant: ${variant.name}`);
  console.log(`   Branch: ${variant.branch}`);
  console.log(`   Strategy: ${mergeStrategy}`);

  // Mark as selected
  setSelectedVariant(rootDir, run.id, variantId);

  // Perform merge
  const currentBranch = getCurrentBranch(rootDir);
  
  if (currentBranch !== run.baseBranch) {
    console.log(`\n⚠️  You are on '${currentBranch}', not '${run.baseBranch}'`);
    console.log(`   Switch to base branch first: git checkout ${run.baseBranch}`);
    console.log(`   Then merge: git merge ${variant.branch}`);
    return;
  }

  try {
    switch (mergeStrategy) {
      case "merge":
        exec(`git merge ${variant.branch} --no-ff -m "Merge POC variant: ${variant.name}"`, rootDir);
        break;
      case "rebase":
        console.log("⚠️  Rebase strategy requires manual execution:");
        console.log(`   git rebase ${variant.branch}`);
        return;
      case "cherry-pick":
        console.log("⚠️  Cherry-pick strategy requires manual execution:");
        console.log(`   git log ${run.baseBranch}..${variant.branch} --oneline`);
        console.log(`   git cherry-pick <commit-hash>`);
        return;
    }

    console.log(`\n✓ Merged ${variant.branch} into ${run.baseBranch}`);
  } catch (error) {
    console.error(`\n✗ Merge failed: ${(error as Error).message}`);
    console.log("\nResolve conflicts manually, then run:");
    console.log("  git add .");
    console.log("  git commit");
  }

  // Update report
  const updatedRun = getHarnessRun(rootDir, run.id);
  if (updatedRun) {
    saveHarnessReport(rootDir, updatedRun);
  }
}

export async function cleanupHarness(
  rootDir: string,
  runId?: string,
  keepSelected = true
): Promise<void> {
  const run = getHarnessRun(rootDir, runId);
  
  if (!run) {
    throw new Error(runId ? `Run not found: ${runId}` : "No harness run found");
  }

  console.log(`\n🧹 Cleaning up harness run: ${run.id}`);

  let removed = 0;
  let kept = 0;

  for (const variant of run.variants) {
    if (keepSelected && run.selectedVariant === variant.id) {
      console.log(`  ⏭ Keeping selected: ${variant.name}`);
      kept++;
      continue;
    }

    console.log(`  Removing ${variant.name}...`);
    
    try {
      removeWorktree(rootDir, variant.worktreePath, variant.branch);
      console.log(`    ✓ Removed worktree and branch`);
      removed++;
    } catch (error) {
      console.error(`    ✗ ${(error as Error).message}`);
    }
  }

  console.log(`\n✓ Cleanup complete: ${removed} removed, ${kept} kept`);
}

export function showHarnessStatus(rootDir: string, runId?: string): void {
  const run = getHarnessRun(rootDir, runId);
  
  if (!run) {
    const state = loadHarnessState(rootDir);
    if (state.history.length === 0) {
      console.log("No harness runs found. Start one with 'ccplate harness --variants N --goal \"...\"'");
    } else {
      console.log(`No active run. ${state.history.length} completed run(s) in history.`);
      console.log("\nRecent runs:");
      for (const r of state.history.slice(-5)) {
        console.log(`  ${r.id} - ${r.goal.slice(0, 40)}... (${r.variants.length} variants)`);
      }
    }
    return;
  }

  printVariantComparison(run);

  console.log("Commands:");
  console.log(`  ccplate harness pick <variant-id>  Select a variant to merge`);
  console.log(`  ccplate harness cleanup            Remove non-selected worktrees`);
  console.log(`  ccplate harness report             View full report`);
}
