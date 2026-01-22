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
