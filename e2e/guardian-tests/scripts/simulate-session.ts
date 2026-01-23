#!/usr/bin/env node

/**
 * Simulate Guardian sessions for testing
 *
 * Usage:
 *   node --experimental-strip-types e2e/guardian-tests/scripts/simulate-session.ts <scenario>
 * 
 * Scenarios:
 *   commit-nudge   - Simulate conditions for commit nudge
 *   test-nudge     - Simulate conditions for test nudge
 *   error-nudge    - Simulate conditions for error nudge
 *   context-nudge  - Simulate high context pressure
 *   full-session   - Run complete development session
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const PROJECT_DIR = process.cwd();
const MEMORY_DIR = join(PROJECT_DIR, "memory");

interface WorkflowState {
  session_id: string | null;
  current_prp_step: number;
  total_prp_steps: number;
  files_changed: number;
  last_commit_time: string | null;
  last_test_time: string | null;
  context_pressure: number;
  active_worktrees: Array<{ id: string; branch: string; agent?: string }>;
  pending_nudges: string[];
  errors_detected: string[];
  lsp_diagnostics_count: number;
  untested_additions: string[];
}

interface GuardianState {
  cooldowns: Array<{
    type: string;
    last_triggered: string;
    tool_uses_since: number;
  }>;
  total_tool_uses: number;
  muted_nudges: string[];
  last_lsp_check?: string;
}

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}



function saveJSON(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function getDefaultWorkflowState(): WorkflowState {
  return {
    session_id: `test-${Date.now()}`,
    current_prp_step: 0,
    total_prp_steps: 0,
    files_changed: 0,
    last_commit_time: null,
    last_test_time: null,
    context_pressure: 0,
    active_worktrees: [],
    pending_nudges: [],
    errors_detected: [],
    lsp_diagnostics_count: 0,
    untested_additions: [],
  };
}

function getDefaultGuardianState(): GuardianState {
  return {
    cooldowns: [],
    total_tool_uses: 0,
    muted_nudges: [],
  };
}

// ============== SCENARIOS ==============

function setupCommitNudge(): void {
  console.log("📝 Setting up COMMIT nudge scenario...\n");
  
  ensureMemoryDir();
  
  // Set workflow state to trigger commit nudge
  const state = getDefaultWorkflowState();
  state.files_changed = 8; // Above threshold of 5
  state.last_commit_time = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 min ago
  
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  saveJSON(join(MEMORY_DIR, "guardian-state.json"), getDefaultGuardianState());
  
  console.log("✅ Workflow state configured:");
  console.log(`   - files_changed: ${state.files_changed}`);
  console.log(`   - last_commit_time: ${state.last_commit_time} (20 min ago)`);
  console.log("\n🔔 Next tool use should trigger commit nudge.");
  console.log("   Check: cat memory/guardian-last.txt");
}

function setupTestNudge(): void {
  console.log("🧪 Setting up TEST nudge scenario...\n");
  
  ensureMemoryDir();
  
  const state = getDefaultWorkflowState();
  state.files_changed = 4; // Below commit threshold (5) but above test threshold (3)
  state.untested_additions = [
    "src/lib/utils/new-helper.ts",
    "src/components/features/new-component.tsx",
  ];
  state.last_commit_time = new Date().toISOString(); // Recent commit (avoids commit nudge)
  state.last_test_time = new Date(Date.now() - 35 * 60 * 1000).toISOString(); // 35 min ago (> 30)
  
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  saveJSON(join(MEMORY_DIR, "guardian-state.json"), getDefaultGuardianState());
  
  console.log("✅ Workflow state configured:");
  console.log(`   - files_changed: ${state.files_changed}`);
  console.log(`   - untested_additions: ${state.untested_additions.join(", ")}`);
  console.log("\n🔔 Next tool use should trigger test nudge.");
}

function setupErrorNudge(): void {
  console.log("❌ Setting up ERROR nudge scenario...\n");
  
  ensureMemoryDir();
  
  const state = getDefaultWorkflowState();
  state.errors_detected = [
    "src/lib/auth.ts:23 - Type 'string' is not assignable to type 'User'",
    "src/components/login.tsx:45 - Property 'email' does not exist",
  ];
  state.lsp_diagnostics_count = 2;
  
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  saveJSON(join(MEMORY_DIR, "guardian-state.json"), getDefaultGuardianState());
  
  console.log("✅ Workflow state configured:");
  console.log(`   - errors_detected: ${state.errors_detected.length} errors`);
  console.log(`   - lsp_diagnostics_count: ${state.lsp_diagnostics_count}`);
  console.log("\n🔔 Next tool use should trigger error nudge.");
}

function setupContextNudge(): void {
  console.log("🧠 Setting up CONTEXT PRESSURE nudge scenario...\n");
  
  ensureMemoryDir();
  
  const state = getDefaultWorkflowState();
  state.context_pressure = 0.85; // Above 0.8 threshold
  
  // Set up context ledger with enough data to trigger 0.8+ pressure
  // Formula: (consultations * 0.05) + (totalExcerpts * 0.01) + (toolUses * 0.002)
  // Need: 0.8+ pressure. With 20 consultations and 60+ excerpts = 1.0 + 0.6 = 0.9+
  const contextLedger = {
    session_id: state.session_id,
    consultations: Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      query: `Query ${i + 1}`,
      sources_checked: [
        { type: "glob", pattern: "**/*.ts", files_matched: 5 },
        { type: "grep", pattern: "function", count: 3 },
      ],
      key_findings: ["finding1", "finding2", "finding3"],
    })),
  };
  
  // Also set guardian state with high tool uses
  const guardianState = getDefaultGuardianState();
  
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  saveJSON(join(MEMORY_DIR, "context-ledger.json"), contextLedger);
  saveJSON(join(MEMORY_DIR, "guardian-state.json"), guardianState);
  
  console.log("✅ Workflow state configured:");
  console.log(`   - context_pressure: ${state.context_pressure}`);
  console.log(`   - consultations: ${contextLedger.consultations.length}`);
  console.log("\n🔔 Next tool use should trigger context pressure nudge.");
}

function runFullSession(): void {
  console.log("🚀 Running FULL SESSION simulation...\n");
  
  ensureMemoryDir();
  
  // Phase 1: Fresh start
  console.log("Phase 1: Starting fresh session");
  const state = getDefaultWorkflowState();
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  saveJSON(join(MEMORY_DIR, "guardian-state.json"), getDefaultGuardianState());
  console.log("   ✅ Clean state initialized\n");
  
  // Phase 2: Simulate file changes
  console.log("Phase 2: Simulating file changes...");
  for (let i = 1; i <= 6; i++) {
    state.files_changed = i;
    saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
    console.log(`   📄 File ${i} changed (total: ${state.files_changed})`);
  }
  console.log("   ✅ 6 files changed\n");
  
  // Phase 3: Time passes (simulate)
  console.log("Phase 3: Simulating time passage (18 minutes)...");
  state.last_commit_time = new Date(Date.now() - 18 * 60 * 1000).toISOString();
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  console.log("   ⏰ Last commit was 18 minutes ago\n");
  
  // Phase 4: Add untested code
  console.log("Phase 4: Adding untested code...");
  state.untested_additions = ["src/new-feature.ts"];
  saveJSON(join(MEMORY_DIR, "workflow-state.json"), state);
  console.log("   ✅ Untested addition tracked\n");
  
  // Summary
  console.log("═══════════════════════════════════════");
  console.log("📊 Session State Summary:");
  console.log(`   Files changed: ${state.files_changed}`);
  console.log(`   Last commit: 18 minutes ago`);
  console.log(`   Untested files: ${state.untested_additions.length}`);
  console.log("═══════════════════════════════════════\n");
  
  console.log("🔔 Expected nudges on next tool use:");
  console.log("   1. Commit nudge (6 files, 18min)");
  console.log("   2. Test nudge (untested code)");
  console.log("\nRun a Claude tool to see nudges, then check:");
  console.log("   cat memory/guardian-last.txt");
  console.log("   cat memory/guardian-nudges.jsonl");
}

function showUsage(): void {
  console.log(`
Guardian Session Simulator
==========================

Usage:
  node --experimental-strip-types e2e/guardian-tests/scripts/simulate-session.ts <scenario>

Scenarios:
  commit-nudge    Set up conditions for commit nudge (6 files, 20min since commit)
  test-nudge      Set up conditions for test nudge (untested additions)
  error-nudge     Set up conditions for error nudge (detected errors)
  context-nudge   Set up conditions for context pressure nudge (85% context)
  full-session    Simulate a complete development session

Examples:
  npm run test:guardian:simulate commit-nudge
  npm run test:guardian:simulate full-session
`);
}

// ============== MAIN ==============

const scenario = process.argv[2];

switch (scenario) {
  case "commit-nudge":
    setupCommitNudge();
    break;
  case "test-nudge":
    setupTestNudge();
    break;
  case "error-nudge":
    setupErrorNudge();
    break;
  case "context-nudge":
    setupContextNudge();
    break;
  case "full-session":
    runFullSession();
    break;
  default:
    showUsage();
    process.exit(1);
}
