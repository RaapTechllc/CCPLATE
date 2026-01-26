/**
 * Team/Enterprise Tier - Multi-Agent Coordination
 * 
 * Orchestrates parallel work across worktrees with configurable human
 * oversight. Supports multiple agents and human developers.
 */

import type { TierConfig, TierQuestion } from "./index";

export const TEAM_CONFIG: TierConfig = {
  tier: "team",
  name: "Team/Enterprise",
  description: "Coordinate multiple agents and developers",
  autonomyLevel: 0.6, // Variable based on configuration
  
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
      warning: 0.4,
      orange: 0.6,
      critical: 0.8,
      forceHandoff: 0.95,
    },
  },
  
  hitlConfig: {
    phaseComplete: "configurable",
    featureComplete: "configurable",
    schemaChange: "always",
    authChange: "always",
    buildError: "configurable",
    testFailure: "configurable",
    newFile: "never",
    fileModify: "never",
    securityConcern: "always",
  },
  
  autoResolve: {
    lintErrors: true,
    buildErrors: true,
    testFailures: true,
    maxRetries: 3,
  },
};

// Team-specific questions
export const TEAM_QUESTIONS: TierQuestion[] = [
  // Standard PRD questions first
  {
    key: "projectName",
    type: "input",
    question: "Project name:",
    required: true,
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
      { label: "Other", value: "Other" },
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
      { label: "Other", value: "Other" },
    ],
  },
  {
    key: "techStack.database",
    type: "select",
    question: "Database?",
    required: true,
    options: [
      { label: "Convex", value: "Convex" },
      { label: "PostgreSQL", value: "PostgreSQL" },
      { label: "MySQL", value: "MySQL" },
      { label: "MongoDB", value: "MongoDB" },
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
      { label: "Auth.js", value: "Auth.js" },
      { label: "Custom", value: "Custom" },
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
      { label: "AWS", value: "AWS" },
      { label: "Self-hosted", value: "Self-hosted" },
    ],
  },
  {
    key: "targetUser",
    type: "textarea",
    question: "Target user:",
    required: true,
    minLength: 20,
  },
  {
    key: "jobsToBeDone",
    type: "textarea",
    question: "Jobs-to-be-done (one per line):",
    required: true,
    parseAs: "list",
  },
  {
    key: "successCriteria",
    type: "textarea",
    question: "Success criteria (one per line):",
    required: true,
    parseAs: "list",
  },
  {
    key: "criticalPaths",
    type: "textarea",
    question: "Critical paths (one per line):",
    required: true,
    parseAs: "list",
  },
  
  // TEAM-SPECIFIC QUESTIONS
  {
    key: "teamStructure",
    type: "select",
    question: "Who's working on this project?",
    required: true,
    options: [
      {
        label: "🤖 Solo developer + Guardian agents",
        value: "solo_agent",
        description: "You direct multiple Guardian agents",
      },
      {
        label: "👥 Multiple human developers",
        value: "multi_human",
        description: "Human team with Guardian supervision",
      },
      {
        label: "🤖🤖 Multiple Guardian agents",
        value: "multi_agent",
        description: "Fully autonomous agent team",
      },
      {
        label: "👥🤖 Mixed human + agent team",
        value: "mixed",
        description: "Humans and agents working together",
      },
    ],
    default: "solo_agent",
  },
  {
    key: "parallelization",
    type: "select",
    question: "How should work be parallelized?",
    required: true,
    options: [
      {
        label: "Sequential - One task at a time",
        value: "sequential",
        description: "Safest, no merge conflicts",
      },
      {
        label: "Parallel by feature",
        value: "feature",
        description: "Different features in separate worktrees",
      },
      {
        label: "Parallel by layer",
        value: "layer",
        description: "Frontend/backend/tests in parallel",
      },
      {
        label: "Maximum parallelism",
        value: "max",
        description: "As much parallel work as safely possible",
      },
    ],
    default: "feature",
  },
  {
    key: "mergeStrategy",
    type: "select",
    question: "Merge approval strategy?",
    required: true,
    options: [
      {
        label: "Auto-merge passing PRs",
        value: "auto",
        description: "If tests pass and no conflicts, merge automatically",
      },
      {
        label: "Human approval required",
        value: "human",
        description: "All merges require human review",
      },
      {
        label: "Lead developer approval",
        value: "lead",
        description: "Designated lead approves all merges",
      },
      {
        label: "Oracle review + human approval",
        value: "oracle_human",
        description: "Oracle reviews first, then human approves",
      },
    ],
    default: "oracle_human",
  },
  {
    key: "maxConcurrentWorktrees",
    type: "select",
    question: "Maximum concurrent worktrees?",
    required: true,
    options: [
      { label: "2 (conservative)", value: "2" },
      { label: "3 (balanced)", value: "3" },
      { label: "5 (aggressive)", value: "5" },
      { label: "Unlimited", value: "unlimited" },
    ],
    default: "3",
  },
  {
    key: "notifications",
    type: "multiselect",
    question: "Where should notifications go?",
    required: true,
    minSelect: 1,
    options: [
      { label: "💬 Slack", value: "slack" },
      { label: "🎮 Discord", value: "discord" },
      { label: "📧 Email", value: "email" },
      { label: "🐙 GitHub Issues/PRs", value: "github" },
      { label: "📱 In-app only", value: "inapp" },
    ],
    default: ["inapp"],
  },
  {
    key: "schemaLockBehavior",
    type: "select",
    question: "How should database schema changes be handled?",
    required: true,
    options: [
      {
        label: "Exclusive lock - One worktree at a time",
        value: "exclusive",
        description: "Prevents all schema conflicts (safest)",
      },
      {
        label: "Queue-based - Queue schema changes",
        value: "queue",
        description: "Schema changes queued and applied in order",
      },
      {
        label: "Advisory - Warn but allow parallel",
        value: "advisory",
        description: "Warn about conflicts but don't block",
      },
    ],
    default: "exclusive",
  },
];

// Team coordination types
export type TeamStructure = "solo_agent" | "multi_human" | "multi_agent" | "mixed";
export type ParallelStrategy = "sequential" | "feature" | "layer" | "max";
export type MergeStrategy = "auto" | "human" | "lead" | "oracle_human";

export interface TeamMember {
  id: string;
  type: "human" | "agent";
  name: string;
  role: "lead" | "developer" | "reviewer" | "tester";
  worktreeId?: string;
  status: "active" | "idle" | "blocked" | "offline";
}

export interface WorkChunk {
  id: string;
  description: string;
  files: string[];
  dependsOn: string[];
  assignedTo?: string;
  worktreeId?: string;
  status: "pending" | "in_progress" | "complete" | "blocked" | "failed";
  startedAt?: string;
  completedAt?: string;
}

export interface TeamCoordinationState {
  sessionId: string;
  teamStructure: TeamStructure;
  parallelStrategy: ParallelStrategy;
  mergeStrategy: MergeStrategy;
  members: TeamMember[];
  chunks: WorkChunk[];
  activeWorktrees: string[];
  maxConcurrentWorktrees: number;
  schemaLockHolder?: string;
  pendingMerges: string[];
}

// Agent type configurations
export interface AgentConfig {
  type: "implementer" | "reviewer" | "tester" | "coordinator";
  autoResolve: {
    lintErrors: boolean;
    buildErrors: boolean;
  };
  commitOnSuccess: boolean;
  requireCoverage?: number;
  blockOnWarning?: boolean;
}

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  implementer: {
    type: "implementer",
    autoResolve: { lintErrors: true, buildErrors: true },
    commitOnSuccess: true,
  },
  reviewer: {
    type: "reviewer",
    autoResolve: { lintErrors: false, buildErrors: false },
    commitOnSuccess: false,
    blockOnWarning: true,
  },
  tester: {
    type: "tester",
    autoResolve: { lintErrors: true, buildErrors: false },
    commitOnSuccess: true,
    requireCoverage: 0.8,
  },
  coordinator: {
    type: "coordinator",
    autoResolve: { lintErrors: true, buildErrors: true },
    commitOnSuccess: false,
  },
};

// Team notification types
export interface TeamNotification {
  type: "hitl_required" | "merge_conflict" | "deploy_ready" | "assigned" | "blocked" | "review_requested" | "chunk_complete";
  severity: "info" | "warning" | "urgent";
  title: string;
  message: string;
  targetMembers: string[]; // "all" or specific member IDs
  channels: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Knowledge mesh auto-sharing
export interface KnowledgeShareConfig {
  autoShare: ("api_changes" | "schema_changes" | "breaking_changes" | "discoveries")[];
  broadcastOnComplete: boolean;
  priorityTopics: string[];
}

export const DEFAULT_KNOWLEDGE_SHARE_CONFIG: KnowledgeShareConfig = {
  autoShare: ["api_changes", "schema_changes", "breaking_changes"],
  broadcastOnComplete: true,
  priorityTopics: ["auth", "api", "schema"],
};

// Generate team coordination dashboard
export function formatTeamDashboard(state: TeamCoordinationState): string {
  const membersByType = {
    human: state.members.filter(m => m.type === "human"),
    agent: state.members.filter(m => m.type === "agent"),
  };
  
  const chunksByStatus = {
    pending: state.chunks.filter(c => c.status === "pending"),
    in_progress: state.chunks.filter(c => c.status === "in_progress"),
    complete: state.chunks.filter(c => c.status === "complete"),
    blocked: state.chunks.filter(c => c.status === "blocked"),
  };
  
  const statusEmoji: Record<string, string> = {
    pending: "⏳",
    in_progress: "▶️",
    complete: "✅",
    blocked: "🔒",
    failed: "❌",
  };
  
  const memberStatusEmoji: Record<string, string> = {
    active: "🟢",
    idle: "🟡",
    blocked: "🔴",
    offline: "⚫",
  };
  
  let output = `
┌─────────────────────────────────────────────────────────────┐
│                 TEAM COORDINATION DASHBOARD                 │
├─────────────────────────────────────────────────────────────┤
│  Session: ${state.sessionId.slice(0, 20)}...
│  Strategy: ${state.parallelStrategy} | Merge: ${state.mergeStrategy}
│  Worktrees: ${state.activeWorktrees.length}/${state.maxConcurrentWorktrees}
├─────────────────────────────────────────────────────────────┤
│  TEAM MEMBERS
`;

  for (const member of state.members) {
    const emoji = member.type === "human" ? "👤" : "🤖";
    const status = memberStatusEmoji[member.status];
    const worktree = member.worktreeId ? ` → ${member.worktreeId}` : "";
    output += `│  ${status} ${emoji} ${member.name} (${member.role})${worktree}\n`;
  }

  output += `├─────────────────────────────────────────────────────────────┤
│  WORK CHUNKS
`;

  for (const chunk of state.chunks) {
    const emoji = statusEmoji[chunk.status];
    const assignee = chunk.assignedTo ? ` [${chunk.assignedTo}]` : "";
    output += `│  ${emoji} ${chunk.description}${assignee}\n`;
    if (chunk.dependsOn.length > 0) {
      output += `│     └─ Depends on: ${chunk.dependsOn.join(", ")}\n`;
    }
  }

  if (state.schemaLockHolder) {
    output += `├─────────────────────────────────────────────────────────────┤
│  🔐 Schema Lock: ${state.schemaLockHolder}
`;
  }

  if (state.pendingMerges.length > 0) {
    output += `├─────────────────────────────────────────────────────────────┤
│  📥 Pending Merges: ${state.pendingMerges.join(", ")}
`;
  }

  output += `└─────────────────────────────────────────────────────────────┘
`;

  return output;
}

// Decompose task into parallelizable chunks
export function decomposeTask(
  description: string,
  files: string[],
  strategy: ParallelStrategy
): WorkChunk[] {
  const chunks: WorkChunk[] = [];
  
  if (strategy === "sequential") {
    // Single chunk, no parallelization
    chunks.push({
      id: "main",
      description,
      files,
      dependsOn: [],
      status: "pending",
    });
    return chunks;
  }
  
  // Group files by directory/type
  const fileGroups: Record<string, string[]> = {
    frontend: [],
    backend: [],
    database: [],
    tests: [],
    config: [],
  };
  
  for (const file of files) {
    if (file.includes("test") || file.includes("spec") || file.includes("e2e")) {
      fileGroups.tests.push(file);
    } else if (file.includes("prisma") || file.includes("schema") || file.includes("convex/schema")) {
      fileGroups.database.push(file);
    } else if (file.includes("/api/") || file.includes("convex/") || file.includes("server")) {
      fileGroups.backend.push(file);
    } else if (file.includes("config") || file.includes(".env") || file.includes("next.config")) {
      fileGroups.config.push(file);
    } else {
      fileGroups.frontend.push(file);
    }
  }
  
  // Create chunks based on strategy
  if (strategy === "layer") {
    // Parallel by layer
    if (fileGroups.database.length > 0) {
      chunks.push({
        id: "database",
        description: "Database schema changes",
        files: fileGroups.database,
        dependsOn: [],
        status: "pending",
      });
    }
    if (fileGroups.backend.length > 0) {
      chunks.push({
        id: "backend",
        description: "Backend API implementation",
        files: fileGroups.backend,
        dependsOn: fileGroups.database.length > 0 ? ["database"] : [],
        status: "pending",
      });
    }
    if (fileGroups.frontend.length > 0) {
      chunks.push({
        id: "frontend",
        description: "Frontend implementation",
        files: fileGroups.frontend,
        dependsOn: fileGroups.backend.length > 0 ? ["backend"] : [],
        status: "pending",
      });
    }
    if (fileGroups.tests.length > 0) {
      chunks.push({
        id: "tests",
        description: "Test implementation",
        files: fileGroups.tests,
        dependsOn: ["frontend", "backend"].filter(id => chunks.some(c => c.id === id)),
        status: "pending",
      });
    }
  } else if (strategy === "feature" || strategy === "max") {
    // Split into independent features where possible
    // For now, use the same logic as layer but with more granularity
    let chunkId = 1;
    
    for (const [group, groupFiles] of Object.entries(fileGroups)) {
      if (groupFiles.length === 0) continue;
      
      // For "max" strategy, split each group further
      if (strategy === "max" && groupFiles.length > 3) {
        const midpoint = Math.ceil(groupFiles.length / 2);
        chunks.push({
          id: `${group}-1`,
          description: `${group} (part 1)`,
          files: groupFiles.slice(0, midpoint),
          dependsOn: group === "frontend" ? ["backend"] : [],
          status: "pending",
        });
        chunks.push({
          id: `${group}-2`,
          description: `${group} (part 2)`,
          files: groupFiles.slice(midpoint),
          dependsOn: group === "frontend" ? ["backend"] : [],
          status: "pending",
        });
      } else {
        chunks.push({
          id: `chunk-${chunkId++}`,
          description: `${group} implementation`,
          files: groupFiles,
          dependsOn: group === "frontend" && chunks.some(c => c.id.includes("backend")) 
            ? chunks.filter(c => c.id.includes("backend")).map(c => c.id) 
            : [],
          status: "pending",
        });
      }
    }
  }
  
  return chunks;
}
