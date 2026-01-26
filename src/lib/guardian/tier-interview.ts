/**
 * Tier-Aware Interview System
 * 
 * Provides different interview experiences based on selected workflow tier:
 * - Beginner: MCQ with conditional follow-ups → auto-derived PRD
 * - Intermediate: Guided questions with smart defaults
 * - Advanced+: Full freeform with suggestions
 */

import * as readline from "readline";
import {
  type WorkflowTier,
  type TierQuestion,
  getTierConfig,
  getTierInfo,
  TIER_SELECTION_QUESTION,
} from "./tiers";
import {
  BEGINNER_QUESTIONS,
  BEGINNER_CONDITIONAL_QUESTIONS,
  getApplicableQuestions,
  deriveBeginnerPRD,
  generatePhases,
  createInitialRalphState,
  type BeginnerAnswers,
  type DerivedPRD,
} from "./tiers/beginner";
import {
  INTERMEDIATE_QUESTIONS,
  generateArchitecturePreview,
} from "./tiers/intermediate";
import { ADVANCED_QUESTIONS } from "./tiers/advanced";
import { EXPERT_QUESTIONS, parseTechStackFreeform } from "./tiers/expert";
import { TEAM_QUESTIONS } from "./tiers/team";
import type { PRDAnswers } from "./prd";

export interface TierInterviewResult {
  tier: WorkflowTier;
  answers: Record<string, unknown>;
  derivedPRD: PRDAnswers;
  enhancedPRD?: DerivedPRD;
  phases?: ReturnType<typeof generatePhases>;
  initialState?: ReturnType<typeof createInitialRalphState>;
}

interface ReadlineInterface {
  question: (prompt: string, callback: (answer: string) => void) => void;
  close: () => void;
}

export async function runTierAwareInterview(): Promise<TierInterviewResult> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Step 1: Select tier
    console.log("\n" + "═".repeat(60));
    console.log("  🎯 CCPLATE Workflow Tier Selection");
    console.log("═".repeat(60) + "\n");

    const tier = await askTierSelection(rl);
    const tierInfo = getTierInfo(tier);
    const tierConfig = getTierConfig(tier);

    console.log(`\n${tierInfo.emoji} Selected: ${tierInfo.name}`);
    console.log(`   "${tierInfo.tagline}"\n`);
    console.log("─".repeat(60) + "\n");

    // Step 2: Run tier-specific interview
    let result: TierInterviewResult;

    switch (tier) {
      case "beginner":
        result = await runBeginnerInterview(rl);
        break;
      case "intermediate":
        result = await runIntermediateInterview(rl);
        break;
      case "advanced":
        result = await runAdvancedInterview(rl);
        break;
      case "expert":
        result = await runExpertInterview(rl);
        break;
      case "team":
        result = await runTeamInterview(rl);
        break;
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }

    return result;
  } finally {
    rl.close();
  }
}

async function askTierSelection(rl: ReadlineInterface): Promise<WorkflowTier> {
  const question = TIER_SELECTION_QUESTION;
  
  console.log("How much control do you want over the development process?\n");
  
  for (let i = 0; i < question.options!.length; i++) {
    const opt = question.options![i];
    console.log(`  ${i + 1}. ${opt.label}`);
    if (opt.description) {
      console.log(`     ${opt.description}\n`);
    }
  }

  const answer = await askQuestion(rl, "\nEnter number [2]: ");
  const index = parseInt(answer || "2", 10) - 1;
  
  if (index >= 0 && index < question.options!.length) {
    return question.options![index].value as WorkflowTier;
  }
  
  return "intermediate"; // default
}

// ============================================================================
// BEGINNER TIER - MCQ with Conditional Follow-ups
// ============================================================================

async function runBeginnerInterview(rl: ReadlineInterface): Promise<TierInterviewResult> {
  console.log("🚀 Beginner Mode: Quick questions, then I'll handle the rest!\n");
  console.log("Just pick options by number. Press Enter for defaults.\n");
  console.log("─".repeat(60) + "\n");

  const answers: Record<string, unknown> = {};

  // Ask core questions first
  for (const question of BEGINNER_QUESTIONS) {
    const answer = await askMCQQuestion(rl, question, answers);
    answers[question.key] = answer;
  }

  // Now ask applicable conditional questions
  const conditionalQuestions = getApplicableQuestions(answers);
  const extraQuestions = conditionalQuestions.filter(
    q => !BEGINNER_QUESTIONS.some(bq => bq.key === q.key)
  );

  if (extraQuestions.length > 0) {
    console.log("\n📋 A few more questions based on your choices:\n");
    
    for (const question of extraQuestions) {
      const answer = await askMCQQuestion(rl, question, answers);
      answers[question.key] = answer;
    }
  }

  // Derive full PRD from answers
  console.log("\n" + "─".repeat(60));
  console.log("🧠 Analyzing your requirements...\n");
  
  const derivedPRD = deriveBeginnerPRD(answers as unknown as BeginnerAnswers);
  
  // Show what was derived
  console.log(`📝 Project: ${derivedPRD.projectName}`);
  console.log(`📊 Complexity: ${derivedPRD.estimatedComplexity}`);
  console.log(`📅 Phases: ${derivedPRD.suggestedPhases}`);
  console.log(`🗄️ Entities detected: ${derivedPRD.keyEntities.join(", ")}`);
  
  if (derivedPRD.convexSchema.length > 0) {
    console.log(`\n📦 Database tables to create:`);
    for (const schema of derivedPRD.convexSchema) {
      console.log(`   - ${schema.tableName}: ${schema.description}`);
    }
  }

  // Generate phases
  const phases = generatePhases(derivedPRD);
  const initialState = createInitialRalphState(phases);

  console.log(`\n🔄 Ralph Loop will execute ${phases.length} phases:`);
  for (const phase of phases) {
    console.log(`   ${phase.emoji} ${phase.name}: ${phase.tasks.length} tasks`);
  }

  // Convert to standard PRDAnswers format
  const standardPRD: PRDAnswers = {
    projectName: derivedPRD.projectName,
    techStack: derivedPRD.techStack,
    targetUser: derivedPRD.targetUser,
    jobsToBeDone: derivedPRD.jobsToBeDone,
    successCriteria: derivedPRD.successCriteria,
    criticalPaths: derivedPRD.criticalPaths,
    nonGoals: derivedPRD.nonGoals,
    timeline: derivedPRD.timeline,
    riskAssumptions: derivedPRD.riskAssumptions,
  };

  return {
    tier: "beginner",
    answers,
    derivedPRD: standardPRD,
    enhancedPRD: derivedPRD,
    phases,
    initialState,
  };
}

async function askMCQQuestion(
  rl: ReadlineInterface,
  question: TierQuestion,
  currentAnswers: Record<string, unknown>
): Promise<unknown> {
  // Check condition if present
  if (question.condition && !question.condition(currentAnswers)) {
    return question.default;
  }

  console.log(`${question.question}\n`);

  if (question.type === "select" && question.options) {
    for (let i = 0; i < question.options.length; i++) {
      const opt = question.options[i];
      const isDefault = opt.value === question.default;
      const marker = isDefault ? " ←" : "";
      console.log(`  ${i + 1}. ${opt.label}${marker}`);
      if (opt.description) {
        console.log(`     ${opt.description}`);
      }
    }

    const defaultIndex = question.options.findIndex(o => o.value === question.default);
    const defaultPrompt = defaultIndex >= 0 ? ` [${defaultIndex + 1}]` : "";
    const answer = await askQuestion(rl, `\nChoice${defaultPrompt}: `);
    
    if (!answer && defaultIndex >= 0) {
      console.log(`   → ${question.options[defaultIndex].label}\n`);
      return question.default;
    }

    const index = parseInt(answer, 10) - 1;
    if (index >= 0 && index < question.options.length) {
      console.log(`   → ${question.options[index].label}\n`);
      return question.options[index].value;
    }
    
    return question.default;
  }

  if (question.type === "multiselect" && question.options) {
    console.log("  (Enter numbers separated by commas, e.g., '1,3,4')\n");
    
    for (let i = 0; i < question.options.length; i++) {
      const opt = question.options[i];
      console.log(`  ${i + 1}. ${opt.label}`);
    }

    const answer = await askQuestion(rl, `\nChoices: `);
    
    if (!answer && question.default) {
      return question.default;
    }

    const indices = answer.split(",").map(s => parseInt(s.trim(), 10) - 1);
    const selected = indices
      .filter(i => i >= 0 && i < question.options!.length)
      .map(i => question.options![i].value);
    
    console.log(`   → Selected ${selected.length} options\n`);
    return selected;
  }

  if (question.type === "input" || question.type === "textarea") {
    const placeholder = question.placeholder ? ` (${question.placeholder})` : "";
    const defaultStr = question.default ? ` [${question.default}]` : "";
    
    let answer = await askQuestion(rl, `${placeholder}${defaultStr}\n> `);
    
    if (!answer && question.default) {
      return question.default;
    }

    // Validate length
    if (question.minLength && answer.length < question.minLength) {
      console.log(`   ⚠ Please enter at least ${question.minLength} characters`);
      answer = await askQuestion(rl, `> `);
    }

    console.log();
    return answer;
  }

  if (question.type === "confirm") {
    const defaultStr = question.default ? " [Y/n]" : " [y/N]";
    const answer = await askQuestion(rl, `${defaultStr}: `);
    
    if (!answer) {
      return question.default ?? false;
    }
    
    return answer.toLowerCase().startsWith("y");
  }

  return question.default;
}

// ============================================================================
// INTERMEDIATE TIER - Guided with Smart Defaults
// ============================================================================

async function runIntermediateInterview(rl: ReadlineInterface): Promise<TierInterviewResult> {
  console.log("🎯 Intermediate Mode: Let's plan the architecture together.\n");
  console.log("─".repeat(60) + "\n");

  const answers: Record<string, unknown> = {};

  for (const question of INTERMEDIATE_QUESTIONS) {
    const answer = await askGuidedQuestion(rl, question, answers);
    answers[question.key] = answer;
  }

  // Generate architecture preview
  console.log("\n" + "─".repeat(60));
  console.log("🏗️ Architecture Preview:\n");
  
  const preview = generateArchitecturePreview(answers);
  console.log(preview);

  // Convert to PRDAnswers
  const derivedPRD = convertToPRDAnswers(answers);

  return {
    tier: "intermediate",
    answers,
    derivedPRD,
  };
}

async function askGuidedQuestion(
  rl: ReadlineInterface,
  question: TierQuestion,
  currentAnswers: Record<string, unknown>
): Promise<unknown> {
  // Similar to MCQ but with more explanation
  if (question.showRationale) {
    console.log(`💡 ${question.description || ""}\n`);
  }

  return askMCQQuestion(rl, question, currentAnswers);
}

// ============================================================================
// ADVANCED TIER - Full Control
// ============================================================================

async function runAdvancedInterview(rl: ReadlineInterface): Promise<TierInterviewResult> {
  console.log("⚙️ Advanced Mode: You're in control. I'll show you every change.\n");
  console.log("─".repeat(60) + "\n");

  const answers: Record<string, unknown> = {};

  for (const question of ADVANCED_QUESTIONS) {
    const answer = await askMCQQuestion(rl, question, answers);
    answers[question.key] = answer;
  }

  const derivedPRD = convertToPRDAnswers(answers);

  return {
    tier: "advanced",
    answers,
    derivedPRD,
  };
}

// ============================================================================
// EXPERT TIER - Freeform with AI Parsing
// ============================================================================

async function runExpertInterview(rl: ReadlineInterface): Promise<TierInterviewResult> {
  console.log("🛠️ Expert Mode: Guardian as advisor, you drive.\n");
  console.log("You can type freely - I'll parse your requirements.\n");
  console.log("─".repeat(60) + "\n");

  const answers: Record<string, unknown> = {};

  for (const question of EXPERT_QUESTIONS) {
    if (question.parseAs === "techStack") {
      const answer = await askFreeformQuestion(rl, question);
      const parsed = parseTechStackFreeform(answer as string);
      answers[question.key] = parsed;
    } else {
      const answer = await askMCQQuestion(rl, question, answers);
      answers[question.key] = answer;
    }
  }

  const derivedPRD = convertToPRDAnswers(answers);

  return {
    tier: "expert",
    answers,
    derivedPRD,
  };
}

async function askFreeformQuestion(
  rl: ReadlineInterface,
  question: TierQuestion
): Promise<string> {
  console.log(`${question.question}\n`);
  
  if (question.placeholder) {
    console.log(`  Example: ${question.placeholder}\n`);
  }

  const lines: string[] = [];
  console.log("  (Enter blank line when done)\n");
  
  let line = await askQuestion(rl, "> ");
  while (line) {
    lines.push(line);
    line = await askQuestion(rl, "> ");
  }

  return lines.join("\n");
}

// ============================================================================
// TEAM TIER - Multi-agent Setup
// ============================================================================

async function runTeamInterview(rl: ReadlineInterface): Promise<TierInterviewResult> {
  console.log("👥 Team Mode: Multi-agent coordination setup.\n");
  console.log("─".repeat(60) + "\n");

  const answers: Record<string, unknown> = {};

  // Include all expert questions plus team-specific
  const allQuestions = [...EXPERT_QUESTIONS, ...TEAM_QUESTIONS];

  for (const question of allQuestions) {
    const answer = await askMCQQuestion(rl, question, answers);
    answers[question.key] = answer;
  }

  const derivedPRD = convertToPRDAnswers(answers);

  return {
    tier: "team",
    answers,
    derivedPRD,
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function askQuestion(rl: ReadlineInterface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

function convertToPRDAnswers(answers: Record<string, unknown>): PRDAnswers {
  const techStack = (answers.techStack as Record<string, string>) || {};
  
  return {
    projectName: (answers.projectName as string) || "MyProject",
    techStack: {
      frontend: techStack.frontend || "Next.js 16",
      backend: techStack.backend || "Convex",
      database: techStack.database || "Convex",
      auth: techStack.auth || "Convex Auth",
      hosting: techStack.hosting || "Vercel",
    },
    targetUser: (answers.targetUser as string) || "",
    jobsToBeDone: (answers.jobsToBeDone as string[]) || [],
    successCriteria: (answers.successCriteria as string[]) || [],
    criticalPaths: (answers.criticalPaths as string[]) || [],
    nonGoals: (answers.nonGoals as string[]) || [],
    timeline: (answers.timeline as string) || "",
    riskAssumptions: (answers.riskAssumptions as string[]) || [],
  };
}

// Export for CLI integration
export {
  askMCQQuestion,
  askQuestion,
  convertToPRDAnswers,
};
