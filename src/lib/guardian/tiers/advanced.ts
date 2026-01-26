/**
 * Advanced Tier - Full Control with Change Preview
 * 
 * User configures which changes require approval. All significant changes
 * are previewed before application. 50% autonomy level.
 */

import type { TierConfig, TierQuestion } from "./index";

export const ADVANCED_CONFIG: TierConfig = {
  tier: "advanced",
  name: "Advanced",
  description: "I'll drive, but I want to see every turn you make",
  autonomyLevel: 0.5,
  
  interviewStyle: "guided",
  showArchitecturePreview: true,
  
  nudgeConfig: {
    suppressTypes: [],
    showTypes: [
      "commit", "test", "lint", "error", "hitl_required",
      "phase_complete", "feature_complete", "file_created",
      "file_modified", "schema_change", "api_change",
      "context_warning", "context_orange", "context_critical",
      "progress",
    ],
    nudgeFormat: "warning",
    contextThresholds: {
      warning: 0.3,
      orange: 0.5,
      critical: 0.7,
      forceHandoff: 0.9,
    },
  },
  
  hitlConfig: {
    phaseComplete: "always",
    featureComplete: "always",
    schemaChange: "always",
    authChange: "always",
    buildError: "always",
    testFailure: "always",
    newFile: "configurable",
    fileModify: "configurable",
    securityConcern: "always",
  },
  
  autoResolve: {
    lintErrors: false,
    buildErrors: false,
    testFailures: false,
    maxRetries: 1,
  },
};

// Advanced Questions - Include control preferences
export const ADVANCED_QUESTIONS: TierQuestion[] = [
  // Standard PRD questions (same as intermediate)
  {
    key: "projectName",
    type: "input",
    question: "Project name:",
    required: true,
    minLength: 2,
    maxLength: 50,
  },
  {
    key: "techStack.frontend",
    type: "select",
    question: "Frontend framework?",
    required: true,
    options: [
      { label: "Next.js 16", value: "Next.js 16" },
      { label: "React + Vite", value: "React (Vite)" },
      { label: "Vue 3 + Nuxt", value: "Vue 3 (Nuxt)" },
      { label: "Svelte + SvelteKit", value: "SvelteKit" },
      { label: "Other (specify in constraints)", value: "Other" },
    ],
  },
  {
    key: "techStack.backend",
    type: "select",
    question: "Backend approach?",
    required: true,
    options: [
      { label: "Convex", value: "Convex" },
      { label: "Next.js API Routes + Prisma", value: "Next.js API Routes + Prisma" },
      { label: "tRPC + Prisma", value: "tRPC + Prisma" },
      { label: "Express + PostgreSQL", value: "Express + PostgreSQL" },
      { label: "Supabase", value: "Supabase" },
      { label: "Firebase", value: "Firebase" },
      { label: "Other (specify in constraints)", value: "Other" },
    ],
  },
  {
    key: "techStack.database",
    type: "select",
    question: "Database?",
    required: true,
    options: [
      { label: "Convex (built-in)", value: "Convex" },
      { label: "PostgreSQL", value: "PostgreSQL" },
      { label: "MySQL", value: "MySQL" },
      { label: "MongoDB", value: "MongoDB" },
      { label: "SQLite", value: "SQLite" },
      { label: "Supabase (PostgreSQL)", value: "Supabase" },
      { label: "PlanetScale", value: "PlanetScale" },
      { label: "None", value: "None" },
    ],
  },
  {
    key: "techStack.auth",
    type: "select",
    question: "Authentication?",
    required: true,
    options: [
      { label: "Convex Auth", value: "Convex Auth" },
      { label: "Clerk", value: "Clerk" },
      { label: "Auth.js (NextAuth)", value: "Auth.js" },
      { label: "Supabase Auth", value: "Supabase Auth" },
      { label: "Custom", value: "Custom" },
      { label: "None", value: "None" },
    ],
  },
  {
    key: "techStack.hosting",
    type: "select",
    question: "Hosting?",
    required: true,
    options: [
      { label: "Vercel", value: "Vercel" },
      { label: "Netlify", value: "Netlify" },
      { label: "Railway", value: "Railway" },
      { label: "AWS", value: "AWS" },
      { label: "Self-hosted", value: "Self-hosted" },
    ],
  },
  {
    key: "targetUser",
    type: "textarea",
    question: "Target user description:",
    required: true,
    minLength: 20,
    maxLength: 500,
  },
  {
    key: "jobsToBeDone",
    type: "textarea",
    question: "Jobs-to-be-done (one per line):",
    required: true,
    minLength: 20,
    parseAs: "list",
  },
  {
    key: "successCriteria",
    type: "textarea",
    question: "Success criteria (one per line):",
    required: true,
    minLength: 50,
    parseAs: "list",
  },
  {
    key: "criticalPaths",
    type: "textarea",
    question: "Critical user paths (one per line):",
    required: true,
    minLength: 30,
    parseAs: "list",
  },
  {
    key: "nonGoals",
    type: "textarea",
    question: "Non-goals / out of scope (one per line, optional):",
    required: false,
    parseAs: "list",
  },
  {
    key: "timeline",
    type: "select",
    question: "Timeline:",
    required: true,
    options: [
      { label: "ASAP", value: "asap" },
      { label: "This week", value: "week" },
      { label: "2-4 weeks", value: "month" },
      { label: "No rush", value: "quality" },
    ],
  },
  
  // ADVANCED-SPECIFIC: Control Preferences
  {
    key: "reviewPreferences",
    type: "multiselect",
    question: "What changes require your approval BEFORE applying?",
    description: "Select all that should pause for your review",
    required: true,
    minSelect: 1,
    options: [
      { label: "📄 New file creation", value: "new_file" },
      { label: "✏️ Any file modification", value: "file_modify" },
      { label: "🗃️ Database schema changes", value: "schema" },
      { label: "🔐 Auth/security changes", value: "auth" },
      { label: "🔌 API endpoint changes", value: "api" },
      { label: "🎨 UI component changes", value: "ui" },
      { label: "🧪 Test modifications", value: "tests" },
      { label: "⚙️ Configuration changes", value: "config" },
    ],
    default: ["schema", "auth", "api"],
  },
  {
    key: "commitStyle",
    type: "select",
    question: "How should changes be committed?",
    required: true,
    options: [
      {
        label: "Micro-commits - Every small change",
        value: "micro",
        description: "Maximum granularity, easy to revert",
      },
      {
        label: "Feature commits - Logical units",
        value: "feature",
        description: "One commit per feature or fix",
      },
      {
        label: "Batch commits - End of session",
        value: "batch",
        description: "Review all changes before committing",
      },
    ],
    default: "feature",
  },
  {
    key: "testRequirements",
    type: "select",
    question: "Testing approach?",
    required: true,
    options: [
      {
        label: "TDD - Write tests first",
        value: "tdd",
        description: "Tests before implementation (most rigorous)",
      },
      {
        label: "Alongside - Tests with implementation",
        value: "alongside",
        description: "Write tests as you build features",
      },
      {
        label: "After - Tests after implementation",
        value: "after",
        description: "Build first, test second",
      },
      {
        label: "Critical only - Test critical paths",
        value: "critical",
        description: "Minimal testing for speed",
      },
    ],
    default: "alongside",
  },
  {
    key: "changeBatchSize",
    type: "select",
    question: "How many pending changes before prompting for review?",
    required: true,
    options: [
      { label: "Every change (1)", value: "1" },
      { label: "After 3 changes", value: "3" },
      { label: "After 5 changes", value: "5" },
      { label: "After 10 changes", value: "10" },
    ],
    default: "3",
  },
];

// Change preview types
export type ChangeImpact = "low" | "medium" | "high" | "critical";
export type ChangeCategory = "schema" | "auth" | "api" | "ui" | "tests" | "config" | "other";

export interface PendingChange {
  id: string;
  type: "create" | "modify" | "delete";
  path: string;
  summary: string;
  diff?: string;
  impact: ChangeImpact;
  category: ChangeCategory;
  timestamp: string;
}

export interface ChangePreviewState {
  pendingChanges: PendingChange[];
  batchThreshold: number;
  requiresReview: ChangeCategory[];
}

// Determine if a change requires review based on user preferences
export function requiresReview(
  change: PendingChange,
  preferences: string[]
): boolean {
  // Always require review for critical impact
  if (change.impact === "critical") {
    return true;
  }
  
  // Check category against preferences
  const categoryToPreference: Record<ChangeCategory, string> = {
    schema: "schema",
    auth: "auth",
    api: "api",
    ui: "ui",
    tests: "tests",
    config: "config",
    other: "file_modify",
  };
  
  const preference = categoryToPreference[change.category];
  if (preferences.includes(preference)) {
    return true;
  }
  
  // Check for new file creation
  if (change.type === "create" && preferences.includes("new_file")) {
    return true;
  }
  
  // Check for any file modification
  if (change.type === "modify" && preferences.includes("file_modify")) {
    return true;
  }
  
  return false;
}

// Categorize a file change
export function categorizeChange(filePath: string): ChangeCategory {
  const path = filePath.toLowerCase();
  
  if (path.includes("schema") || path.includes("migration") || path.includes("prisma")) {
    return "schema";
  }
  if (path.includes("auth") || path.includes("session") || path.includes("login") || path.includes("password")) {
    return "auth";
  }
  if (path.includes("/api/") || path.includes("route.ts") || path.includes("endpoint")) {
    return "api";
  }
  if (path.includes("component") || path.includes(".tsx") || path.includes(".jsx") || path.includes("ui/")) {
    return "ui";
  }
  if (path.includes(".test.") || path.includes(".spec.") || path.includes("__tests__")) {
    return "tests";
  }
  if (path.includes("config") || path.includes(".env") || path.includes("next.config") || path.includes("tsconfig")) {
    return "config";
  }
  
  return "other";
}

// Determine impact level
export function assessImpact(change: PendingChange): ChangeImpact {
  // Critical: schema changes, auth changes, production config
  if (change.category === "schema" || change.category === "auth") {
    return "critical";
  }
  
  // High: API changes, major UI components
  if (change.category === "api") {
    return "high";
  }
  
  // Medium: UI components, tests
  if (change.category === "ui" || change.category === "tests") {
    return "medium";
  }
  
  // Low: everything else
  return "low";
}

// Generate change preview display
export function formatChangePreview(changes: PendingChange[]): string {
  if (changes.length === 0) {
    return "No pending changes.";
  }
  
  const impactEmoji: Record<ChangeImpact, string> = {
    low: "🟢",
    medium: "🟡",
    high: "🟠",
    critical: "🔴",
  };
  
  const typeEmoji: Record<string, string> = {
    create: "📝",
    modify: "✏️",
    delete: "🗑️",
  };
  
  let output = `
┌─────────────────────────────────────────────────────────────┐
│                    PENDING CHANGES (${changes.length})                      │
├─────────────────────────────────────────────────────────────┤
`;
  
  for (const change of changes) {
    output += `
│  ${typeEmoji[change.type]} ${change.type.toUpperCase()}: ${change.path}
│     └─ Impact: ${impactEmoji[change.impact]} ${change.impact.toUpperCase()} (${change.category})
│     └─ ${change.summary}
`;
  }
  
  output += `
├─────────────────────────────────────────────────────────────┤
│  [Apply All] [Review Each] [Skip] [Modify Plan]             │
└─────────────────────────────────────────────────────────────┘
`;
  
  return output;
}
