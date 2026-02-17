/**
 * CCPLATE Workflow Tiers
 * 
 * Five workflow frameworks ranging from fully autonomous (Beginner)
 * to multi-agent coordination (Team/Enterprise).
 */

export type WorkflowTier = "beginner" | "intermediate" | "advanced" | "expert" | "team";

export interface TierConfig {
  tier: WorkflowTier;
  name: string;
  description: string;
  autonomyLevel: number; // 0-1, percentage of autonomous operation
  
  // PRD Interview
  interviewStyle: "mcq" | "guided" | "freeform";
  showArchitecturePreview: boolean;
  
  // Nudge behavior
  nudgeConfig: TierNudgeConfig;
  
  // HITL checkpoints
  hitlConfig: TierHITLConfig;
  
  // Auto-resolve behavior
  autoResolve: TierAutoResolveConfig;
}

export interface TierNudgeConfig {
  suppressTypes: NudgeType[];
  showTypes: NudgeType[];
  nudgeFormat: "warning" | "suggestion" | "info";
  contextThresholds: ContextThresholds;
}

export interface ContextThresholds {
  warning: number;
  orange: number;
  critical: number;
  forceHandoff: number;
}

export interface TierHITLConfig {
  phaseComplete: HITLRequirement;
  featureComplete: HITLRequirement;
  schemaChange: HITLRequirement;
  authChange: HITLRequirement;
  buildError: HITLRequirement;
  testFailure: HITLRequirement;
  newFile: HITLRequirement;
  fileModify: HITLRequirement;
  securityConcern: HITLRequirement;
}

export type HITLRequirement = "always" | "configurable" | "suggestion" | "never";

export interface TierAutoResolveConfig {
  lintErrors: boolean;
  buildErrors: boolean;
  testFailures: boolean;
  maxRetries: number;
}

export type NudgeType = 
  | "commit"
  | "test"
  | "lint"
  | "error"
  | "hitl_required"
  | "phase_complete"
  | "feature_complete"
  | "file_created"
  | "file_modified"
  | "schema_change"
  | "api_change"
  | "context_warning"
  | "context_orange"
  | "context_critical"
  | "progress";

// Tier-specific PRD question types
export interface TierQuestion {
  key: string;
  type: "select" | "multiselect" | "input" | "textarea" | "confirm";
  question: string;
  required: boolean;
  options?: TierQuestionOption[];
  default?: string | string[] | boolean;
  placeholder?: string;
  description?: string;
  minLength?: number;
  maxLength?: number;
  minSelect?: number;
  maxSelect?: number;
  allowCustom?: boolean;
  parseAs?: "techStack" | "prd" | "list";
  showRationale?: boolean;
  condition?: (answers: Record<string, unknown>) => boolean;
}

export interface TierQuestionOption {
  label: string;
  value: string;
  description?: string;
}

// Export tier configs
export { BEGINNER_CONFIG } from "./beginner";
export { INTERMEDIATE_CONFIG } from "./intermediate";
export { ADVANCED_CONFIG } from "./advanced";
export { EXPERT_CONFIG } from "./expert";
export { TEAM_CONFIG } from "./team";

// Export Beginner tier enhanced types and functions
export {
  BEGINNER_ENHANCED_CONFIG,
  BEGINNER_QUESTIONS,
  BEGINNER_CONDITIONAL_QUESTIONS,
  BEGINNER_PHASES,
  getApplicableQuestions,
  deriveBeginnerPRD,
  generatePhases,
  createInitialRalphState,
  evaluatePhaseTransition,
  COMMON_ERROR_PATTERNS,
  type BeginnerEnhancedConfig,
  type BeginnerAnswers,
  type DerivedPRD,
  type ConvexSchemaHint,
  type PhaseTask,
  type PhaseDefinition,
  type PhaseTransitionGate,
  type HITLCheckpoint,
  type CheckpointMetric,
  type RalphLoopState,
  type ErrorPattern,
  type RalphMetrics,
} from "./beginner";

import { BEGINNER_CONFIG } from "./beginner";
import { INTERMEDIATE_CONFIG } from "./intermediate";
import { ADVANCED_CONFIG } from "./advanced";
import { EXPERT_CONFIG } from "./expert";
import { TEAM_CONFIG } from "./team";

const TIER_CONFIGS: Record<WorkflowTier, TierConfig> = {
  beginner: BEGINNER_CONFIG,
  intermediate: INTERMEDIATE_CONFIG,
  advanced: ADVANCED_CONFIG,
  expert: EXPERT_CONFIG,
  team: TEAM_CONFIG,
};

// Get config by tier
export function getTierConfig(tier: WorkflowTier): TierConfig {
  const config = TIER_CONFIGS[tier];
  if (!config) {
    throw new Error(`Unknown tier: ${tier}`);
  }
  return config;
}

// Get tier display info
export function getTierInfo(tier: WorkflowTier): { emoji: string; name: string; tagline: string } {
  const info: Record<WorkflowTier, { emoji: string; name: string; tagline: string }> = {
    beginner: {
      emoji: "🚀",
      name: "Beginner",
      tagline: "Tell me what you want, I'll handle the rest",
    },
    intermediate: {
      emoji: "🎯",
      name: "Intermediate", 
      tagline: "Guide me through architecture, then watch me build",
    },
    advanced: {
      emoji: "⚙️",
      name: "Advanced",
      tagline: "I'll drive, but show me every turn",
    },
    expert: {
      emoji: "🛠️",
      name: "Expert",
      tagline: "Guardian as advisor, not driver",
    },
    team: {
      emoji: "👥",
      name: "Team/Enterprise",
      tagline: "Coordinate multiple agents and developers",
    },
  };
  return info[tier];
}

// Tier selection question
export const TIER_SELECTION_QUESTION: TierQuestion = {
  key: "workflowTier",
  type: "select",
  question: "How much control do you want over the development process?",
  required: true,
  options: [
    {
      label: "🚀 Beginner - Just tell me what to build (95% autonomous)",
      value: "beginner",
      description: "Answer a few multiple-choice questions, then Guardian builds autonomously with checkpoints at phase boundaries.",
    },
    {
      label: "🎯 Intermediate - Review architecture first (75% autonomous)",
      value: "intermediate",
      description: "Full PRD with smart defaults, architecture preview, then autonomous building with feature checkpoints.",
    },
    {
      label: "⚙️ Advanced - Show me every change (50% autonomous)",
      value: "advanced",
      description: "Preview all changes before they're applied. Configure which changes need approval.",
    },
    {
      label: "🛠️ Expert - Guardian as advisor only (25% autonomous)",
      value: "expert",
      description: "Guardian provides suggestions and warnings but takes no action without explicit approval.",
    },
    {
      label: "👥 Team - Multi-agent coordination",
      value: "team",
      description: "Orchestrate parallel work across worktrees with configurable human oversight.",
    },
  ],
  default: "intermediate",
};
