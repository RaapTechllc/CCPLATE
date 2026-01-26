/**
 * Progress Emitter - Real-Time Event Broadcasting
 * 
 * Pub/sub pattern for streaming workflow progress updates.
 * Supports SSE endpoints, webhooks, and direct subscriptions.
 * 
 * Key features:
 * - Buffer events when no listeners (replay on connect)
 * - Webhook delivery for Slack/Discord
 * - Type-safe event system
 * - Automatic cleanup of stale subscriptions
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
import { join } from "path";

// ============================================================================
// TYPES
// ============================================================================

export type ProgressStatus = "pending" | "running" | "completed" | "error" | "waiting";

export type ProgressType = 
  | "workflow"
  | "phase"
  | "task"
  | "build"
  | "test"
  | "error"
  | "hitl"
  | "checkpoint";

export interface ProgressUpdate {
  type: ProgressType;
  status: ProgressStatus;
  message: string;
  timestamp: string;
  phaseId?: string;
  taskId?: string;
  data?: Record<string, unknown>;
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export interface WebhookConfig {
  url: string;
  type: "slack" | "discord" | "generic";
  events?: ProgressType[];
  enabled: boolean;
}

export interface SubscriptionInfo {
  id: string;
  callback: ProgressCallback;
  filters?: ProgressType[];
  createdAt: number;
  lastEventAt?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_BUFFER_SIZE = 100;
const SUBSCRIPTION_CLEANUP_INTERVAL = 60000; // 1 minute
const STALE_SUBSCRIPTION_THRESHOLD = 300000; // 5 minutes
const WEBHOOK_TIMEOUT = 5000;

// ============================================================================
// PROGRESS EMITTER CLASS
// ============================================================================

class ProgressEmitterImpl {
  private subscriptions: Map<string, SubscriptionInfo>;
  private eventBuffer: ProgressUpdate[];
  private webhooks: WebhookConfig[];
  private cleanupInterval: NodeJS.Timeout | null;
  private rootDir: string;
  
  constructor() {
    this.subscriptions = new Map();
    this.eventBuffer = [];
    this.webhooks = [];
    this.cleanupInterval = null;
    this.rootDir = process.cwd();
  }
  
  /**
   * Set root directory for file operations
   */
  setRootDir(rootDir: string): void {
    this.rootDir = rootDir;
  }
  
  /**
   * Start cleanup interval
   */
  startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscriptions();
    }, SUBSCRIPTION_CLEANUP_INTERVAL);
  }
  
  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback, filters?: ProgressType[]): string {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    this.subscriptions.set(id, {
      id,
      callback,
      filters,
      createdAt: Date.now(),
    });
    
    this.startCleanup();
    
    return id;
  }
  
  /**
   * Unsubscribe from progress updates
   */
  unsubscribe(id: string): boolean {
    return this.subscriptions.delete(id);
  }
  
  /**
   * Emit a progress update to all subscribers
   */
  emit(update: ProgressUpdate): void {
    // Add to buffer
    this.eventBuffer.push(update);
    if (this.eventBuffer.length > MAX_BUFFER_SIZE) {
      this.eventBuffer.shift();
    }
    
    // Log to file
    this.logToFile(update);
    
    // Notify subscribers
    for (const [id, sub] of this.subscriptions) {
      // Check filters
      if (sub.filters && sub.filters.length > 0) {
        if (!sub.filters.includes(update.type)) continue;
      }
      
      try {
        sub.callback(update);
        sub.lastEventAt = Date.now();
      } catch (error) {
        console.error(`Error in subscription ${id}:`, error);
      }
    }
    
    // Send to webhooks
    this.sendToWebhooks(update);
  }
  
  /**
   * Get buffered events (for replay on connect)
   */
  getBufferedEvents(since?: string, types?: ProgressType[]): ProgressUpdate[] {
    let events = [...this.eventBuffer];
    
    if (since) {
      const sinceTime = new Date(since).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
    }
    
    if (types && types.length > 0) {
      events = events.filter(e => types.includes(e.type));
    }
    
    return events;
  }
  
  /**
   * Clear the event buffer
   */
  clearBuffer(): void {
    this.eventBuffer = [];
  }
  
  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscriptions.size;
  }
  
  /**
   * Register a webhook
   */
  registerWebhook(config: WebhookConfig): void {
    // Remove existing webhook with same URL
    this.webhooks = this.webhooks.filter(w => w.url !== config.url);
    this.webhooks.push(config);
  }
  
  /**
   * Remove a webhook
   */
  removeWebhook(url: string): boolean {
    const initialLength = this.webhooks.length;
    this.webhooks = this.webhooks.filter(w => w.url !== url);
    return this.webhooks.length < initialLength;
  }
  
  /**
   * Get registered webhooks
   */
  getWebhooks(): WebhookConfig[] {
    return [...this.webhooks];
  }
  
  /**
   * Create an SSE stream generator
   */
  createSSEStream(filters?: ProgressType[]): {
    subscribe: () => string;
    unsubscribe: (id: string) => void;
    getEvents: () => AsyncGenerator<ProgressUpdate, void, unknown>;
  } {
    const events: ProgressUpdate[] = [];
    let resolver: ((value: ProgressUpdate | null) => void) | null = null;
    let closed = false;
    
    const callback: ProgressCallback = (update) => {
      if (closed) return;
      
      if (resolver) {
        resolver(update);
        resolver = null;
      } else {
        events.push(update);
      }
    };
    
    const id = this.subscribe(callback, filters);
    
    async function* generator(): AsyncGenerator<ProgressUpdate, void, unknown> {
      while (!closed) {
        if (events.length > 0) {
          yield events.shift()!;
        } else {
          const event = await new Promise<ProgressUpdate | null>((resolve) => {
            resolver = resolve;
            setTimeout(() => {
              if (resolver === resolve) {
                resolve(null);
                resolver = null;
              }
            }, 30000); // Heartbeat timeout
          });
          
          if (event) {
            yield event;
          }
        }
      }
    }
    
    return {
      subscribe: () => id,
      unsubscribe: (subId: string) => {
        closed = true;
        if (resolver) resolver(null);
        this.unsubscribe(subId);
      },
      getEvents: generator.bind(this),
    };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private cleanupStaleSubscriptions(): void {
    const now = Date.now();
    
    for (const [id, sub] of this.subscriptions) {
      // Check if subscription is stale (no events received recently)
      const lastActivity = sub.lastEventAt || sub.createdAt;
      if (now - lastActivity > STALE_SUBSCRIPTION_THRESHOLD) {
        this.subscriptions.delete(id);
      }
    }
    
    // Stop cleanup if no subscribers
    if (this.subscriptions.size === 0) {
      this.stopCleanup();
    }
  }
  
  private logToFile(update: ProgressUpdate): void {
    try {
      const memoryDir = join(this.rootDir, "memory");
      if (!existsSync(memoryDir)) {
        mkdirSync(memoryDir, { recursive: true });
      }
      
      const logPath = join(memoryDir, "ralph-progress.jsonl");
      const line = JSON.stringify(update) + "\n";
      appendFileSync(logPath, line, "utf-8");
    } catch {
      // Ignore file errors
    }
  }
  
  private async sendToWebhooks(update: ProgressUpdate): Promise<void> {
    for (const webhook of this.webhooks) {
      if (!webhook.enabled) continue;
      
      // Check event filter
      if (webhook.events && webhook.events.length > 0) {
        if (!webhook.events.includes(update.type)) continue;
      }
      
      try {
        await this.sendWebhook(webhook, update);
      } catch (error) {
        console.error(`Webhook failed for ${webhook.url}:`, error);
      }
    }
  }
  
  private async sendWebhook(webhook: WebhookConfig, update: ProgressUpdate): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);
    
    try {
      let body: string;
      let headers: Record<string, string>;
      
      switch (webhook.type) {
        case "slack":
          body = JSON.stringify(this.formatSlackMessage(update));
          headers = { "Content-Type": "application/json" };
          break;
          
        case "discord":
          body = JSON.stringify(this.formatDiscordMessage(update));
          headers = { "Content-Type": "application/json" };
          break;
          
        default:
          body = JSON.stringify(update);
          headers = { "Content-Type": "application/json" };
      }
      
      await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
  
  private formatSlackMessage(update: ProgressUpdate): Record<string, unknown> {
    const emoji = this.getStatusEmoji(update.status);
    const color = this.getStatusColor(update.status);
    
    return {
      attachments: [{
        color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${emoji} *${update.type.toUpperCase()}* - ${update.message}`,
            },
          },
          ...(update.phaseId || update.taskId ? [{
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: [
                  update.phaseId ? `Phase: \`${update.phaseId}\`` : null,
                  update.taskId ? `Task: \`${update.taskId}\`` : null,
                ].filter(Boolean).join(" | "),
              },
            ],
          }] : []),
        ],
      }],
    };
  }
  
  private formatDiscordMessage(update: ProgressUpdate): Record<string, unknown> {
    const emoji = this.getStatusEmoji(update.status);
    const color = this.getStatusColorHex(update.status);
    
    return {
      embeds: [{
        title: `${emoji} ${update.type.toUpperCase()}`,
        description: update.message,
        color,
        fields: [
          ...(update.phaseId ? [{ name: "Phase", value: update.phaseId, inline: true }] : []),
          ...(update.taskId ? [{ name: "Task", value: update.taskId, inline: true }] : []),
        ],
        timestamp: update.timestamp,
      }],
    };
  }
  
  private getStatusEmoji(status: ProgressStatus): string {
    switch (status) {
      case "pending": return "⏳";
      case "running": return "🔄";
      case "completed": return "✅";
      case "error": return "❌";
      case "waiting": return "🚧";
      default: return "📝";
    }
  }
  
  private getStatusColor(status: ProgressStatus): string {
    switch (status) {
      case "pending": return "#808080";
      case "running": return "#2196F3";
      case "completed": return "#4CAF50";
      case "error": return "#F44336";
      case "waiting": return "#FF9800";
      default: return "#9E9E9E";
    }
  }
  
  private getStatusColorHex(status: ProgressStatus): number {
    switch (status) {
      case "pending": return 0x808080;
      case "running": return 0x2196F3;
      case "completed": return 0x4CAF50;
      case "error": return 0xF44336;
      case "waiting": return 0xFF9800;
      default: return 0x9E9E9E;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const progressEmitter = new ProgressEmitterImpl();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load progress events from file
 */
export function loadProgressEvents(rootDir: string, since?: string): ProgressUpdate[] {
  const logPath = join(rootDir, "memory", "ralph-progress.jsonl");
  
  if (!existsSync(logPath)) {
    return [];
  }
  
  try {
    const content = readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    
    let events = lines.map(line => {
      try {
        return JSON.parse(line) as ProgressUpdate;
      } catch {
        return null;
      }
    }).filter((e): e is ProgressUpdate => e !== null);
    
    if (since) {
      const sinceTime = new Date(since).getTime();
      events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
    }
    
    return events;
  } catch {
    return [];
  }
}

/**
 * Format progress update for display
 */
export function formatProgressUpdate(update: ProgressUpdate): string {
  const time = new Date(update.timestamp).toLocaleTimeString();
  const emoji = getStatusEmoji(update.status);
  
  let line = `${time} ${emoji} [${update.type.toUpperCase()}] ${update.message}`;
  
  if (update.phaseId) {
    line += ` (phase: ${update.phaseId})`;
  }
  if (update.taskId) {
    line += ` (task: ${update.taskId})`;
  }
  
  return line;
}

function getStatusEmoji(status: ProgressStatus): string {
  switch (status) {
    case "pending": return "⏳";
    case "running": return "🔄";
    case "completed": return "✅";
    case "error": return "❌";
    case "waiting": return "🚧";
    default: return "📝";
  }
}

/**
 * Create a typed progress update
 */
export function createProgressUpdate(
  type: ProgressType,
  status: ProgressStatus,
  message: string,
  extra?: {
    phaseId?: string;
    taskId?: string;
    data?: Record<string, unknown>;
  },
): ProgressUpdate {
  return {
    type,
    status,
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}
