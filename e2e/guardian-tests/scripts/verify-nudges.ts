#!/usr/bin/env bun

/**
 * Verify Guardian nudge generation
 * 
 * Usage:
 *   bun run e2e/guardian-tests/scripts/verify-nudges.ts [type]
 * 
 * Types:
 *   commit   - Verify commit nudge
 *   test     - Verify test nudge
 *   error    - Verify error nudge
 *   context  - Verify context pressure nudge
 *   all      - Verify all nudge types (default)
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const PROJECT_DIR = process.cwd();
const MEMORY_DIR = join(PROJECT_DIR, "memory");

interface NudgeEntry {
  timestamp: string;
  type: string;
  message: string;
  trigger: Record<string, unknown>;
  cooldownUntil: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

function loadNudges(): NudgeEntry[] {
  const path = join(MEMORY_DIR, "guardian-nudges.jsonl");
  if (!existsSync(path)) {
    return [];
  }
  
  const content = readFileSync(path, "utf-8");
  return content
    .trim()
    .split("\n")
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function loadLastNudge(): string | null {
  const path = join(MEMORY_DIR, "guardian-last.txt");
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, "utf-8").trim();
}



// ============== TESTS ==============

function verifyCommitNudge(): TestResult {
  const nudges = loadNudges();
  const commitNudges = nudges.filter(n => n.type === "commit");
  if (commitNudges.length === 0) {
    return {
      name: "Commit Nudge",
      passed: false,
      details: "No commit nudges found in guardian-nudges.jsonl",
    };
  }
  
  const latest = commitNudges[commitNudges.length - 1];
  const hasFileCount = latest.message.includes("files changed");
  const hasTimeInfo = latest.message.includes("min");
  
  if (!hasFileCount || !hasTimeInfo) {
    return {
      name: "Commit Nudge",
      passed: false,
      details: `Nudge message malformed: "${latest.message}"`,
    };
  }
  
  return {
    name: "Commit Nudge",
    passed: true,
    details: `Found ${commitNudges.length} commit nudge(s). Latest: "${latest.message}"`,
  };
}

function verifyTestNudge(): TestResult {
  const nudges = loadNudges();
  const testNudges = nudges.filter(n => n.type === "test");
  
  if (testNudges.length === 0) {
    return {
      name: "Test Nudge",
      passed: false,
      details: "No test nudges found in guardian-nudges.jsonl",
    };
  }
  
  const latest = testNudges[testNudges.length - 1];
  const mentionsTests = latest.message.toLowerCase().includes("test");
  
  if (!mentionsTests) {
    return {
      name: "Test Nudge",
      passed: false,
      details: `Nudge message doesn't mention tests: "${latest.message}"`,
    };
  }
  
  return {
    name: "Test Nudge",
    passed: true,
    details: `Found ${testNudges.length} test nudge(s). Latest: "${latest.message}"`,
  };
}

function verifyErrorNudge(): TestResult {
  const nudges = loadNudges();
  const errorNudges = nudges.filter(n => n.type === "error");
  
  if (errorNudges.length === 0) {
    return {
      name: "Error Nudge",
      passed: false,
      details: "No error nudges found in guardian-nudges.jsonl",
    };
  }
  
  const latest = errorNudges[errorNudges.length - 1];
  const mentionsError = latest.message.toLowerCase().includes("error");
  
  if (!mentionsError) {
    return {
      name: "Error Nudge",
      passed: false,
      details: `Nudge message doesn't mention errors: "${latest.message}"`,
    };
  }
  
  return {
    name: "Error Nudge",
    passed: true,
    details: `Found ${errorNudges.length} error nudge(s). Latest: "${latest.message}"`,
  };
}

function verifyContextNudge(): TestResult {
  const nudges = loadNudges();
  const contextNudges = nudges.filter(n => n.type === "context");
  
  if (contextNudges.length === 0) {
    return {
      name: "Context Pressure Nudge",
      passed: false,
      details: "No context nudges found in guardian-nudges.jsonl",
    };
  }
  
  const latest = contextNudges[contextNudges.length - 1];
  const mentionsContext = latest.message.toLowerCase().includes("context");
  
  if (!mentionsContext) {
    return {
      name: "Context Pressure Nudge",
      passed: false,
      details: `Nudge message doesn't mention context: "${latest.message}"`,
    };
  }
  
  return {
    name: "Context Pressure Nudge",
    passed: true,
    details: `Found ${contextNudges.length} context nudge(s). Latest: "${latest.message}"`,
  };
}

function verifyLastNudgeFile(): TestResult {
  const lastNudge = loadLastNudge();
  
  if (!lastNudge) {
    return {
      name: "Last Nudge File",
      passed: false,
      details: "memory/guardian-last.txt not found or empty",
    };
  }
  
  if (!lastNudge.startsWith("💡")) {
    return {
      name: "Last Nudge File",
      passed: false,
      details: `Last nudge doesn't start with 💡: "${lastNudge.substring(0, 50)}..."`,
    };
  }
  
  return {
    name: "Last Nudge File",
    passed: true,
    details: `Last nudge: "${lastNudge.substring(0, 60)}..."`,
  };
}

function verifyCooldown(): TestResult {
  const nudges = loadNudges();
  
  if (nudges.length < 2) {
    return {
      name: "Cooldown Mechanism",
      passed: true,
      details: "Not enough nudges to verify cooldown (need 2+)",
    };
  }
  
  // Check if same-type nudges respect cooldown
  const byType = new Map<string, NudgeEntry[]>();
  for (const nudge of nudges) {
    const list = byType.get(nudge.type) || [];
    list.push(nudge);
    byType.set(nudge.type, list);
  }
  
  for (const [type, typeNudges] of byType) {
    if (typeNudges.length >= 2) {
      const sorted = typeNudges.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].timestamp).getTime();
        const curr = new Date(sorted[i].timestamp).getTime();
        const diffMinutes = (curr - prev) / (1000 * 60);
        
        if (diffMinutes < 10) {
          return {
            name: "Cooldown Mechanism",
            passed: false,
            details: `Type '${type}' nudged twice within ${diffMinutes.toFixed(1)} minutes (cooldown is 10min)`,
          };
        }
      }
    }
  }
  
  return {
    name: "Cooldown Mechanism",
    passed: true,
    details: "All nudges respect cooldown period",
  };
}

function printResults(results: TestResult[]): void {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("                GUARDIAN NUDGE VERIFICATION             ");
  console.log("═══════════════════════════════════════════════════════\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    const status = result.passed ? "PASS" : "FAIL";
    
    console.log(`${icon} ${result.name}: ${status}`);
    console.log(`   ${result.details}\n`);
    
    if (result.passed) passed++;
    else failed++;
  }
  
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════\n");
  
  process.exit(failed > 0 ? 1 : 0);
}

// ============== MAIN ==============

const type = process.argv[2] || "all";
const results: TestResult[] = [];

switch (type) {
  case "commit":
    results.push(verifyCommitNudge());
    results.push(verifyLastNudgeFile());
    break;
  case "test":
    results.push(verifyTestNudge());
    results.push(verifyLastNudgeFile());
    break;
  case "error":
    results.push(verifyErrorNudge());
    results.push(verifyLastNudgeFile());
    break;
  case "context":
    results.push(verifyContextNudge());
    results.push(verifyLastNudgeFile());
    break;
  case "all":
    results.push(verifyCommitNudge());
    results.push(verifyTestNudge());
    results.push(verifyErrorNudge());
    results.push(verifyContextNudge());
    results.push(verifyLastNudgeFile());
    results.push(verifyCooldown());
    break;
  default:
    console.log(`Unknown type: ${type}`);
    console.log("Valid types: commit, test, error, context, all");
    process.exit(1);
}

printResults(results);
