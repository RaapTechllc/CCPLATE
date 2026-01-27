// Worktree resolver
export {
  loadState,
  saveState,
  findWorktreeForEntity,
  associateEntityWithWorktree,
  getOrCreateWorktreeForEntity,
  removeWorktreeAssociation,
  cleanupStaleAssociations,
} from './worktree-resolver';

// HITL (Human-in-the-loop)
export {
  requestHumanDecision,
  resolveHITLRequest,
  getPendingHITLRequests,
  getHITLRequest,
  getAllHITLRequests,
  needsHumanApproval,
  type HITLRequest,
  type HITLReason,
} from './hitl';

// Notifications
export {
  sendSlackNotification,
  sendDiscordNotification,
  sendEmailNotification,
  notifyHITLRequest,
  type NotificationConfig,
  type NotificationResult,
} from './notifications';

// Knowledge mesh
export {
  broadcast,
  getKnowledge,
  formatKnowledgeForPrompt,
  getKnowledgeForFiles,
  getNewKnowledgeSince,
  getHighPriorityKnowledge,
  type KnowledgeType,
  type KnowledgeEntry,
} from './knowledge-mesh';

// Job queue
export {
  createJob,
  updateJob,
  getJob,
  getAllJobs,
  getPendingJobs,
  getPausedJobs,
  getJobsAwaitingHitl,
  pauseJob,
  resumeJob,
  getJobByHitlRequest,
  type GuardianJob,
} from './job-queue';

// Job executor
export {
  executeJob,
  processQueue,
} from './job-executor';

// Preflight checks
export {
  runPreflightChecks,
  autoFixWorktree,
  formatPreflightResult,
  type PreflightCheck,
  type PreflightResult,
} from './preflight';

// Schema lock
export {
  acquireSchemaLock,
  releaseSchemaLock,
  getSchemaLockStatus,
  type SchemaLock,
  type LockResult,
} from './schema-lock';

// PRD
export {
  loadPRD,
  savePRD,
  runInteractiveInterview,
  generatePRDMarkdown,
  getPRDHash,
  updateWorkflowStateWithPRD,
  type PRD,
  type PRDAnswers,
  type PRDMetadata,
} from './prd';

// Playwright validation
export {
  runPlaywrightTests,
  loadValidationState,
  saveValidationState,
  loadTaskTestMap,
  saveTaskTestMap,
  registerTaskTests,
  parsePlaywrightJsonReport,
  parsePlaywrightOutput,
  findLatestScreenshot,
  checkTaskCanComplete,
  startFixLoop,
  incrementFixLoopAttempt,
  endFixLoop,
  getFixLoopContext,
  formatValidationStatus,
  type PlaywrightTestResult,
  type PlaywrightRunResult,
  type ValidationState,
  type TaskTestMapping,
} from './playwright-validation';

// Activity narrator
export {
  loadNarratorState,
  saveNarratorState,
  appendActivity,
  narrateToolUse,
  narrateTestResult,
  narrateTaskStart,
  narrateTaskComplete,
  narrateHITLRequest,
  incrementLoop,
  getCurrentLoop,
  clearActivityLog,
  type ActivityEntry,
  type NarratorState,
} from './activity-narrator';

// Harness (re-export barrel)
export * from './harness';

// Merge ledger
export {
  recordMerge,
  getMergeHistory,
  getLastMerge,
  rollbackMerge,
  formatMergeHistory,
  type MergeRecord,
} from './merge-ledger';

// Audit log
export {
  logAudit,
  logSettingChange,
  logPermissionChange,
  logSchemaChange,
  logSecurityEvent,
  logHITLDecision,
  logAuthEvent,
  getAuditEntries,
  formatAuditEntries,
  type AuditCategory,
  type AuditEntry,
} from './audit-log';

// Structured logger
export {
  createLogger,
  loggers,
  parseLogEntries,
  formatLogEntries,
  type LogLevel,
  type LogEntry,
} from './logger';

// Labeling (parallel-safety)
export {
  AREA_LABELS,
  getLabelsForFiles,
  hasAreaConflict,
  getAreaPatterns,
  extractFileMentions,
  inferTypeLabel,
  inferPriorityLabel,
  analyzeIssue,
  checkParallelSafety,
  formatParallelCheckResult,
  type AreaLabel,
  type IssueAnalysis,
  type ParallelCheckResult,
} from './labeling';

// Merge conflict resolver
export {
  getConflictedFiles,
  extractConflictMarkers,
  analyzeConflict,
  applyResolution,
  resolveConflicts,
  formatConflictAnalysis,
  type ConflictType,
  type ConflictMarker,
  type ConflictAnalysis,
  type ResolutionResult,
} from './merge-resolver';

// Workflow Tiers
export {
  getTierConfig,
  getTierInfo,
  TIER_SELECTION_QUESTION,
  type WorkflowTier,
  type TierConfig,
  type TierQuestion,
  type TierQuestionOption,
  type TierNudgeConfig,
  type TierHITLConfig,
  type TierAutoResolveConfig,
  type ContextThresholds,
  type HITLRequirement,
  type NudgeType,
} from './tiers';

// Beginner tier (enhanced)
export {
  BEGINNER_CONFIG,
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
} from './tiers/beginner';

// Intermediate tier
export {
  INTERMEDIATE_CONFIG,
  INTERMEDIATE_QUESTIONS,
  generateArchitecturePreview,
} from './tiers/intermediate';

// Advanced tier
export {
  ADVANCED_CONFIG,
  ADVANCED_QUESTIONS,
  requiresReview,
  categorizeChange,
  assessImpact,
  formatChangePreview,
  type ChangeImpact,
  type ChangeCategory,
  type PendingChange,
  type ChangePreviewState,
} from './tiers/advanced';

// Expert tier
export {
  EXPERT_CONFIG,
  EXPERT_QUESTIONS,
  getExpertModeConfig,
  formatAdvisorOutput,
  parseTechStackFreeform,
  parseRequirementsFreeform,
  type GuardianRole,
  type ExpertModeConfig,
  type Observation,
  type AdvisorOutput,
} from './tiers/expert';

// Team tier
export {
  TEAM_CONFIG,
  TEAM_QUESTIONS,
  AGENT_CONFIGS,
  DEFAULT_KNOWLEDGE_SHARE_CONFIG,
  formatTeamDashboard,
  decomposeTask,
  type TeamStructure,
  type ParallelStrategy,
  type MergeStrategy,
  type TeamMember,
  type WorkChunk,
  type TeamCoordinationState,
  type AgentConfig,
  type TeamNotification,
  type KnowledgeShareConfig,
} from './tiers/team';

// Tier-aware interview
export {
  runTierAwareInterview,
  askMCQQuestion,
  askQuestion,
  convertToPRDAnswers,
  type TierInterviewResult,
} from './tier-interview';

// HITL capture
export {
  captureHITLCheckpoint,
  formatCheckpointSummary,
  quickCapture,
  getVercelPreviewUrl,
  deployVercelPreview,
  type CaptureResult,
  type MetricResult,
} from './hitl-capture';

// Ralph Engine (Durable Workflow)
export {
  RalphEngine,
  loadEvents,
  loadCheckpoint,
  clearEvents,
  clearCheckpoint,
  appendEvent,
  saveCheckpoint,
  replayEvents,
  generateEventId,
  type WorkflowEventType,
  type WorkflowEvent,
  type WorkflowCheckpoint,
  type TaskExecution,
  type RetryConfig,
} from './ralph-engine';

// Progress Emitter (Real-Time SSE)
export {
  progressEmitter,
  loadProgressEvents,
  formatProgressUpdate,
  createProgressUpdate,
  type ProgressStatus,
  type ProgressType,
  type ProgressUpdate,
  type ProgressCallback,
  type WebhookConfig,
  type SubscriptionInfo,
} from './progress-emitter';

// Task Orchestrator (DAG Execution)
export {
  TaskOrchestrator,
  buildTaskGraph,
  topologicalSort,
  generateExecutionPlan,
  formatExecutionPlan,
  formatGraphAsMermaid,
  type TaskNode,
  type TaskGraph,
  type ExecutionPlan,
  type ResourceLimits,
  type OrchestratorConfig,
} from './task-orchestrator';

// Quality Gate (Pre-commit Validation)
export {
  runQualityGate,
  runQuickCheck,
  checkTypeScript,
  checkLint,
  checkCoverage,
  checkSecurity,
  checkBundleSize,
  formatQualityGateResult,
  DEFAULT_QUALITY_GATE_CONFIG,
  SECRET_PATTERNS,
  VULNERABILITY_PATTERNS,
  type GateStatus,
  type GateCheckResult,
  type QualityGateResult,
  type QualityGateConfig,
  type SecretPattern,
  type CoverageData,
} from './quality-gate';

// Error Recovery (Self-Healing System)
export {
  initializePatternDB,
  loadPatternDB,
  savePatternDB,
  categorizeError,
  matchError,
  attemptRecovery,
  recordAttempt,
  recordOutcome,
  learnPattern,
  getDBStats,
  getSuccessRate,
  formatRecoveryResult,
  getPatternDBPath,
  type ErrorCategory,
  type FixOutcome,
  type FixStrategy,
  type ErrorPattern,
  type ErrorExample,
  type ErrorMatch,
  type FixAttempt,
  type ErrorPatternDB,
  type RecoveryResult,
} from './error-recovery';

// Smart Handoff (Context Compression)
export {
  analyzeNextTask,
  gatherContextItems,
  compressContext,
  hashFullContext,
  saveFullContext,
  loadFullContext,
  createSmartHandoff,
  loadSmartHandoff,
  formatContextForPrompt,
  formatSmartHandoff,
  DEFAULT_HANDOFF_CONFIG,
  type ContextPriority,
  type ContextItem,
  type ContextType,
  type TaskAnalysis,
  type CompressedContext,
  type HandoffConfig,
  type SmartHandoffResult,
} from './smart-handoff';
