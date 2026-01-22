export {
  loadState,
  saveState,
  findWorktreeForEntity,
  associateEntityWithWorktree,
  getOrCreateWorktreeForEntity,
  removeWorktreeAssociation,
  cleanupStaleAssociations,
} from './worktree-resolver';

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

export {
  sendSlackNotification,
  sendDiscordNotification,
  sendEmailNotification,
  notifyHITLRequest,
  type NotificationConfig,
  type NotificationResult,
} from './notifications';

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
