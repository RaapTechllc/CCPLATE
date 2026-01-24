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
