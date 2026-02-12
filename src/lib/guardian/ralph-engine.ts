/**
 * Ralph Engine - Durable Workflow Execution
 * 
 * Event-sourced execution with checkpoint/resume capability.
 * Survives crashes and restarts by replaying events.
 * 
 * Key features:
 * - Event log persistence to memory/ralph-events.jsonl
 * - Idempotent task execution with checksum deduplication
 * - Exponential backoff retry with configurable limits
 * - Checkpoint/resume for crash recovery
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { 
  PhaseDefinition, 
  PhaseTask, 
  RalphLoopState, 
  RalphMetrics,
  DerivedPRD,
} from "./tiers/beginner";
import { evaluatePhaseTransition } from "./tiers/beginner";
import { progressEmitter, type ProgressUpdate } from "./progress-emitter";

// ============================================================================
// EVENT TYPES
// ============================================================================

export type WorkflowEventType =
  | "WORKFLOW_STARTED"
  | "WORKFLOW_COMPLETED"
  | "WORKFLOW_FAILED"
  | "PHASE_STARTED"
  | "PHASE_COMPLETED"
  | "PHASE_FAILED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "TASK_SKIPPED"
  | "TASK_RETRIED"
  | "HITL_REQUESTED"
  | "HITL_RESOLVED"
  | "BUILD_OUTPUT"
  | "TEST_RESULT"
  | "ERROR_DETECTED"
  | "ERROR_FIXED"
  | "CHECKPOINT_CREATED"
  | "CHECKPOINT_RESUMED";

export interface WorkflowEvent {
  id: string;
  type: WorkflowEventType;
  timestamp: string;
  phaseId?: string;
  taskId?: string;
  payload: Record<string, unknown>;
  checksum?: string;
}

export interface WorkflowCheckpoint {
  id: string;
  timestamp: string;
  state: RalphLoopState;
  phases: PhaseDefinition[];
  prd: DerivedPRD;
  lastEventId: string;
  metadata: {
    totalEvents: number;
    version: string;
  };
}

export interface TaskExecution {
  taskId: string;
  attempt: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  retryAfter?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEMORY_DIR = "memory";
const EVENTS_FILE = "ralph-events.jsonl";
const CHECKPOINT_FILE = "ralph-checkpoint.json";
const ENGINE_VERSION = "1.0.0";

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function ensureMemoryDir(rootDir: string): string {
  const memoryPath = join(rootDir, MEMORY_DIR);
  if (!existsSync(memoryPath)) {
    mkdirSync(memoryPath, { recursive: true });
  }
  return memoryPath;
}

export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateCheckpointId(): string {
  return `ckpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeChecksum(data: unknown): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(data));
  return hash.digest("hex").slice(0, 16);
}

function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

// ============================================================================
// EVENT LOG OPERATIONS
// ============================================================================

export function appendEvent(rootDir: string, event: WorkflowEvent): void {
  const memoryPath = ensureMemoryDir(rootDir);
  const eventsPath = join(memoryPath, EVENTS_FILE);
  
  const line = JSON.stringify(event) + "\n";
  appendFileSync(eventsPath, line, "utf-8");
  
  // Emit progress update
  emitProgressFromEvent(event);
}

export function loadEvents(rootDir: string): WorkflowEvent[] {
  const eventsPath = join(rootDir, MEMORY_DIR, EVENTS_FILE);
  
  if (!existsSync(eventsPath)) {
    return [];
  }
  
  const content = readFileSync(eventsPath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  
  return lines.map(line => {
    try {
      return JSON.parse(line) as WorkflowEvent;
    } catch {
      return null;
    }
  }).filter((e): e is WorkflowEvent => e !== null);
}

export function clearEvents(rootDir: string): void {
  const eventsPath = join(rootDir, MEMORY_DIR, EVENTS_FILE);
  if (existsSync(eventsPath)) {
    writeFileSync(eventsPath, "", "utf-8");
  }
}

// ============================================================================
// CHECKPOINT OPERATIONS
// ============================================================================

export function saveCheckpoint(rootDir: string, checkpoint: WorkflowCheckpoint): void {
  const memoryPath = ensureMemoryDir(rootDir);
  const checkpointPath = join(memoryPath, CHECKPOINT_FILE);
  
  writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), "utf-8");
  
  // Log checkpoint event
  appendEvent(rootDir, {
    id: generateEventId(),
    type: "CHECKPOINT_CREATED",
    timestamp: new Date().toISOString(),
    payload: {
      checkpointId: checkpoint.id,
      totalEvents: checkpoint.metadata.totalEvents,
    },
  });
}

export function loadCheckpoint(rootDir: string): WorkflowCheckpoint | null {
  const checkpointPath = join(rootDir, MEMORY_DIR, CHECKPOINT_FILE);
  
  if (!existsSync(checkpointPath)) {
    return null;
  }
  
  try {
    return JSON.parse(readFileSync(checkpointPath, "utf-8"));
  } catch {
    return null;
  }
}

export function clearCheckpoint(rootDir: string): void {
  const checkpointPath = join(rootDir, MEMORY_DIR, CHECKPOINT_FILE);
  if (existsSync(checkpointPath)) {
    writeFileSync(checkpointPath, "", "utf-8");
  }
}

// ============================================================================
// STATE RECONSTRUCTION
// ============================================================================

export function replayEvents(
  events: WorkflowEvent[],
  initialState: RalphLoopState,
): RalphLoopState {
  let state = { ...initialState };
  
  for (const event of events) {
    state = applyEvent(state, event);
  }
  
  return state;
}

function applyEvent(state: RalphLoopState, event: WorkflowEvent): RalphLoopState {
  const newState = { ...state };
  
  switch (event.type) {
    case "PHASE_STARTED":
      newState.currentPhase = event.phaseId || state.currentPhase;
      newState.lastCheckpoint = Date.now();
      break;
      
    case "TASK_STARTED":
      newState.currentTask = event.taskId || null;
      newState.iteration++;
      newState.metrics = {
        ...newState.metrics,
        totalIterations: newState.metrics.totalIterations + 1,
      };
      break;
      
    case "TASK_COMPLETED":
      if (event.taskId && !newState.tasksCompleted.includes(event.taskId)) {
        newState.tasksCompleted = [...newState.tasksCompleted, event.taskId];
      }
      newState.currentTask = null;
      
      // Update average task time
      const taskTime = event.payload.durationMs as number | undefined;
      if (taskTime) {
        const totalTasks = newState.tasksCompleted.length;
        const prevAvg = newState.metrics.averageTaskTime;
        newState.metrics = {
          ...newState.metrics,
          averageTaskTime: (prevAvg * (totalTasks - 1) + taskTime) / totalTasks,
        };
      }
      break;
      
    case "TASK_FAILED":
      if (event.taskId && !newState.tasksFailed.includes(event.taskId)) {
        newState.tasksFailed = [...newState.tasksFailed, event.taskId];
      }
      newState.currentTask = null;
      break;
      
    case "BUILD_OUTPUT":
      const buildSuccess = event.payload.success as boolean | undefined;
      if (buildSuccess !== undefined) {
        newState.metrics = {
          ...newState.metrics,
          successfulBuilds: newState.metrics.successfulBuilds + (buildSuccess ? 1 : 0),
          failedBuilds: newState.metrics.failedBuilds + (buildSuccess ? 0 : 1),
        };
      }
      break;
      
    case "TEST_RESULT":
      const testsPassed = event.payload.passed as boolean | undefined;
      newState.metrics = {
        ...newState.metrics,
        testsRun: newState.metrics.testsRun + 1,
        testsPassed: newState.metrics.testsPassed + (testsPassed ? 1 : 0),
      };
      break;
      
    case "ERROR_DETECTED":
      const pattern = event.payload.pattern as string | undefined;
      if (pattern) {
        const existingIdx = newState.errorPatterns.findIndex(p => p.pattern === pattern);
        if (existingIdx >= 0) {
          newState.errorPatterns[existingIdx] = {
            ...newState.errorPatterns[existingIdx],
            occurrences: newState.errorPatterns[existingIdx].occurrences + 1,
            lastSeen: Date.now(),
          };
        } else {
          newState.errorPatterns = [
            ...newState.errorPatterns,
            {
              pattern,
              occurrences: 1,
              lastSeen: Date.now(),
              autoFixAttempted: false,
            },
          ];
        }
      }
      break;
  }
  
  return newState;
}

// ============================================================================
// PROGRESS EMISSION
// ============================================================================

function emitProgressFromEvent(event: WorkflowEvent): void {
  let update: ProgressUpdate | null = null;
  
  switch (event.type) {
    case "WORKFLOW_STARTED":
      update = {
        type: "workflow",
        status: "running",
        message: "Workflow started",
        timestamp: event.timestamp,
      };
      break;
      
    case "PHASE_STARTED":
      update = {
        type: "phase",
        status: "running",
        phaseId: event.phaseId,
        message: `Phase started: ${event.phaseId}`,
        timestamp: event.timestamp,
      };
      break;
      
    case "PHASE_COMPLETED":
      update = {
        type: "phase",
        status: "completed",
        phaseId: event.phaseId,
        message: `Phase completed: ${event.phaseId}`,
        timestamp: event.timestamp,
      };
      break;
      
    case "TASK_STARTED":
      update = {
        type: "task",
        status: "running",
        taskId: event.taskId,
        phaseId: event.phaseId,
        message: `Task started: ${event.taskId}`,
        timestamp: event.timestamp,
      };
      break;
      
    case "TASK_COMPLETED":
      update = {
        type: "task",
        status: "completed",
        taskId: event.taskId,
        phaseId: event.phaseId,
        message: `Task completed: ${event.taskId}`,
        timestamp: event.timestamp,
        data: event.payload,
      };
      break;
      
    case "TASK_FAILED":
      update = {
        type: "task",
        status: "error",
        taskId: event.taskId,
        phaseId: event.phaseId,
        message: `Task failed: ${event.taskId}`,
        timestamp: event.timestamp,
        data: { error: event.payload.error },
      };
      break;
      
    case "BUILD_OUTPUT":
      update = {
        type: "build",
        status: event.payload.success ? "completed" : "error",
        message: event.payload.success ? "Build succeeded" : "Build failed",
        timestamp: event.timestamp,
        data: { output: event.payload.output },
      };
      break;
      
    case "TEST_RESULT":
      update = {
        type: "test",
        status: event.payload.passed ? "completed" : "error",
        message: event.payload.passed ? "Tests passed" : "Tests failed",
        timestamp: event.timestamp,
        data: event.payload,
      };
      break;
      
    case "ERROR_DETECTED":
      update = {
        type: "error",
        status: "error",
        message: `Error: ${event.payload.message || event.payload.pattern}`,
        timestamp: event.timestamp,
        data: event.payload,
      };
      break;
      
    case "HITL_REQUESTED":
      update = {
        type: "hitl",
        status: "waiting",
        message: `HITL required: ${event.payload.reason}`,
        timestamp: event.timestamp,
        data: event.payload,
      };
      break;
  }
  
  if (update) {
    progressEmitter.emit(update);
  }
}

// ============================================================================
// RALPH ENGINE CLASS
// ============================================================================

export class RalphEngine {
  private rootDir: string;
  private state: RalphLoopState;
  private phases: PhaseDefinition[];
  private prd: DerivedPRD;
  private retryConfig: RetryConfig;
  private taskExecutions: Map<string, TaskExecution>;
  private processedChecksums: Set<string>;
  private running: boolean;
  private paused: boolean;
  
  constructor(
    rootDir: string,
    phases: PhaseDefinition[],
    prd: DerivedPRD,
    initialState?: RalphLoopState,
    retryConfig?: Partial<RetryConfig>,
  ) {
    this.rootDir = rootDir;
    this.phases = phases;
    this.prd = prd;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.taskExecutions = new Map();
    this.processedChecksums = new Set();
    this.running = false;
    this.paused = false;
    
    // Initialize or restore state
    if (initialState) {
      this.state = initialState;
    } else {
      this.state = this.initializeState();
    }
  }
  
  private initializeState(): RalphLoopState {
    return {
      currentPhase: this.phases[0]?.id || "foundation",
      currentTask: null,
      tasksCompleted: [],
      tasksFailed: [],
      iteration: 0,
      startTime: Date.now(),
      lastCheckpoint: Date.now(),
      errorPatterns: [],
      metrics: {
        totalIterations: 0,
        successfulBuilds: 0,
        failedBuilds: 0,
        testsRun: 0,
        testsPassed: 0,
        commitsCreated: 0,
        averageTaskTime: 0,
      },
    };
  }
  
  /**
   * Resume from last checkpoint if available
   */
  static resume(rootDir: string): RalphEngine | null {
    const checkpoint = loadCheckpoint(rootDir);
    if (!checkpoint) {
      return null;
    }
    
    const engine = new RalphEngine(
      rootDir,
      checkpoint.phases,
      checkpoint.prd,
      checkpoint.state,
    );
    
    // Load events since checkpoint and replay
    const allEvents = loadEvents(rootDir);
    const checkpointIdx = allEvents.findIndex(e => e.id === checkpoint.lastEventId);
    
    if (checkpointIdx >= 0 && checkpointIdx < allEvents.length - 1) {
      const newEvents = allEvents.slice(checkpointIdx + 1);
      engine.state = replayEvents(newEvents, engine.state);
    }
    
    // Build checksum set for idempotency
    for (const event of allEvents) {
      if (event.checksum) {
        engine.processedChecksums.add(event.checksum);
      }
    }
    
    // Log resume event
    appendEvent(rootDir, {
      id: generateEventId(),
      type: "CHECKPOINT_RESUMED",
      timestamp: new Date().toISOString(),
      payload: {
        checkpointId: checkpoint.id,
        statePhase: engine.state.currentPhase,
        tasksCompleted: engine.state.tasksCompleted.length,
      },
    });
    
    return engine;
  }
  
  /**
   * Create a checkpoint for crash recovery
   */
  checkpoint(): WorkflowCheckpoint {
    const events = loadEvents(this.rootDir);
    const lastEvent = events[events.length - 1];
    
    const checkpoint: WorkflowCheckpoint = {
      id: generateCheckpointId(),
      timestamp: new Date().toISOString(),
      state: { ...this.state },
      phases: this.phases,
      prd: this.prd,
      lastEventId: lastEvent?.id || "",
      metadata: {
        totalEvents: events.length,
        version: ENGINE_VERSION,
      },
    };
    
    saveCheckpoint(this.rootDir, checkpoint);
    this.state.lastCheckpoint = Date.now();
    
    return checkpoint;
  }
  
  /**
   * Get current state
   */
  getState(): RalphLoopState {
    return { ...this.state };
  }
  
  /**
   * Get current phase
   */
  getCurrentPhase(): PhaseDefinition | undefined {
    return this.phases.find(p => p.id === this.state.currentPhase);
  }
  
  /**
   * Get phase by ID
   */
  getPhase(phaseId: string): PhaseDefinition | undefined {
    return this.phases.find(p => p.id === phaseId);
  }
  
  /**
   * Start workflow execution
   */
  async start(
    executeTask: (task: PhaseTask, phase: PhaseDefinition) => Promise<{ success: boolean; output?: string; error?: string }>,
  ): Promise<void> {
    if (this.running) {
      throw new Error("Workflow already running");
    }
    
    this.running = true;
    this.paused = false;
    
    // Log workflow start
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "WORKFLOW_STARTED",
      timestamp: new Date().toISOString(),
      payload: {
        totalPhases: this.phases.length,
        prdName: this.prd.projectName,
      },
    });
    
    try {
      await this.runWorkflow(executeTask);
      
      // Log workflow completion
      appendEvent(this.rootDir, {
        id: generateEventId(),
        type: "WORKFLOW_COMPLETED",
        timestamp: new Date().toISOString(),
        payload: {
          metrics: this.state.metrics,
          duration: Date.now() - this.state.startTime,
        },
      });
    } catch (error) {
      // Log workflow failure
      appendEvent(this.rootDir, {
        id: generateEventId(),
        type: "WORKFLOW_FAILED",
        timestamp: new Date().toISOString(),
        payload: {
          error: error instanceof Error ? error.message : String(error),
          metrics: this.state.metrics,
        },
      });
      throw error;
    } finally {
      this.running = false;
    }
  }
  
  private async runWorkflow(
    executeTask: (task: PhaseTask, phase: PhaseDefinition) => Promise<{ success: boolean; output?: string; error?: string }>,
  ): Promise<void> {
    for (const phase of this.phases) {
      if (this.paused) {
        this.checkpoint();
        return;
      }
      
      // Skip phases before current
      const phaseIdx = this.phases.findIndex(p => p.id === phase.id);
      const currentIdx = this.phases.findIndex(p => p.id === this.state.currentPhase);
      if (phaseIdx < currentIdx) continue;
      
      await this.runPhase(phase, executeTask);
    }
  }
  
  private async runPhase(
    phase: PhaseDefinition,
    executeTask: (task: PhaseTask, phase: PhaseDefinition) => Promise<{ success: boolean; output?: string; error?: string }>,
  ): Promise<void> {
    // Log phase start
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "PHASE_STARTED",
      timestamp: new Date().toISOString(),
      phaseId: phase.id,
      payload: {
        name: phase.name,
        taskCount: phase.tasks.length,
      },
    });
    
    this.state.currentPhase = phase.id;
    
    // Execute tasks in order (respecting dependencies)
    const pendingTasks = [...phase.tasks];
    
    while (pendingTasks.length > 0) {
      if (this.paused) return;
      
      // Find tasks with satisfied dependencies
      const readyTasks = pendingTasks.filter(task => {
        if (this.state.tasksCompleted.includes(task.id)) return false;
        if (this.state.tasksFailed.includes(task.id)) return false;
        
        const deps = task.dependencies || [];
        return deps.every(dep => this.state.tasksCompleted.includes(dep));
      });
      
      if (readyTasks.length === 0) {
        // No ready tasks - check for blocked
        const blockedTasks = pendingTasks.filter(
          t => !this.state.tasksCompleted.includes(t.id) && 
               !this.state.tasksFailed.includes(t.id)
        );
        
        if (blockedTasks.length > 0) {
          // All remaining tasks are blocked by failed dependencies
          break;
        }
        break;
      }
      
      // Execute ready tasks (one at a time for now)
      for (const task of readyTasks) {
        await this.executeTaskWithRetry(task, phase, executeTask);
        
        // Remove from pending
        const idx = pendingTasks.findIndex(t => t.id === task.id);
        if (idx >= 0) pendingTasks.splice(idx, 1);
      }
      
      // Checkpoint periodically
      if (this.state.iteration % 5 === 0) {
        this.checkpoint();
      }
    }
    
    // Check phase transition
    const transitionResult = evaluatePhaseTransition(this.state, phase);
    
    if (transitionResult.shouldTransition) {
      appendEvent(this.rootDir, {
        id: generateEventId(),
        type: "PHASE_COMPLETED",
        timestamp: new Date().toISOString(),
        phaseId: phase.id,
        payload: {
          reason: transitionResult.reason,
          tasksCompleted: this.state.tasksCompleted.length,
        },
      });
    } else {
      appendEvent(this.rootDir, {
        id: generateEventId(),
        type: "PHASE_FAILED",
        timestamp: new Date().toISOString(),
        phaseId: phase.id,
        payload: {
          reason: transitionResult.reason,
          blockers: transitionResult.blockers,
        },
      });
    }
  }
  
  private async executeTaskWithRetry(
    task: PhaseTask,
    phase: PhaseDefinition,
    executeTask: (task: PhaseTask, phase: PhaseDefinition) => Promise<{ success: boolean; output?: string; error?: string }>,
  ): Promise<void> {
    // Check idempotency
    const checksum = computeChecksum({ taskId: task.id, phaseId: phase.id });
    if (this.processedChecksums.has(checksum)) {
      appendEvent(this.rootDir, {
        id: generateEventId(),
        type: "TASK_SKIPPED",
        timestamp: new Date().toISOString(),
        phaseId: phase.id,
        taskId: task.id,
        checksum,
        payload: { reason: "already_processed" },
      });
      return;
    }
    
    const execution: TaskExecution = {
      taskId: task.id,
      attempt: 0,
      status: "pending",
    };
    
    this.taskExecutions.set(task.id, execution);
    
    while (execution.attempt < this.retryConfig.maxAttempts) {
      execution.attempt++;
      execution.status = "running";
      execution.startedAt = new Date().toISOString();
      
      // Log task start
      appendEvent(this.rootDir, {
        id: generateEventId(),
        type: "TASK_STARTED",
        timestamp: new Date().toISOString(),
        phaseId: phase.id,
        taskId: task.id,
        payload: {
          description: task.description,
          attempt: execution.attempt,
          estimatedMinutes: task.estimatedMinutes,
        },
      });
      
      this.state.currentTask = task.id;
      
      try {
        const startTime = Date.now();
        const result = await executeTask(task, phase);
        const durationMs = Date.now() - startTime;
        
        if (result.success) {
          execution.status = "completed";
          execution.completedAt = new Date().toISOString();
          execution.output = result.output;
          
          // Log success
          appendEvent(this.rootDir, {
            id: generateEventId(),
            type: "TASK_COMPLETED",
            timestamp: new Date().toISOString(),
            phaseId: phase.id,
            taskId: task.id,
            checksum,
            payload: {
              durationMs,
              output: result.output?.slice(0, 500),
            },
          });
          
          this.state.tasksCompleted.push(task.id);
          this.processedChecksums.add(checksum);
          return;
        } else {
          throw new Error(result.error || "Task failed");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        execution.error = errorMessage;
        
        // Log error
        appendEvent(this.rootDir, {
          id: generateEventId(),
          type: "ERROR_DETECTED",
          timestamp: new Date().toISOString(),
          phaseId: phase.id,
          taskId: task.id,
          payload: {
            message: errorMessage,
            attempt: execution.attempt,
          },
        });
        
        if (execution.attempt < this.retryConfig.maxAttempts) {
          // Calculate retry delay
          const delay = calculateRetryDelay(execution.attempt, this.retryConfig);
          execution.retryAfter = Date.now() + delay;
          
          appendEvent(this.rootDir, {
            id: generateEventId(),
            type: "TASK_RETRIED",
            timestamp: new Date().toISOString(),
            phaseId: phase.id,
            taskId: task.id,
            payload: {
              attempt: execution.attempt,
              nextAttempt: execution.attempt + 1,
              delayMs: delay,
            },
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Max retries exhausted
    execution.status = "failed";
    
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "TASK_FAILED",
      timestamp: new Date().toISOString(),
      phaseId: phase.id,
      taskId: task.id,
      payload: {
        error: execution.error,
        attempts: execution.attempt,
      },
    });
    
    this.state.tasksFailed.push(task.id);
  }
  
  /**
   * Pause workflow execution
   */
  pause(): void {
    this.paused = true;
    this.checkpoint();
  }
  
  /**
   * Check if workflow is running
   */
  isRunning(): boolean {
    return this.running;
  }
  
  /**
   * Check if workflow is paused
   */
  isPaused(): boolean {
    return this.paused;
  }
  
  /**
   * Record build output
   */
  recordBuild(success: boolean, output?: string): void {
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "BUILD_OUTPUT",
      timestamp: new Date().toISOString(),
      phaseId: this.state.currentPhase,
      payload: {
        success,
        output: output?.slice(0, 2000),
      },
    });
  }
  
  /**
   * Record test result
   */
  recordTest(passed: boolean, testName?: string, details?: Record<string, unknown>): void {
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "TEST_RESULT",
      timestamp: new Date().toISOString(),
      phaseId: this.state.currentPhase,
      payload: {
        passed,
        testName,
        ...details,
      },
    });
  }
  
  /**
   * Request HITL intervention
   */
  requestHITL(reason: string, data?: Record<string, unknown>): void {
    this.paused = true;
    
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "HITL_REQUESTED",
      timestamp: new Date().toISOString(),
      phaseId: this.state.currentPhase,
      payload: {
        reason,
        ...data,
      },
    });
    
    this.checkpoint();
  }
  
  /**
   * Resolve HITL request and continue
   */
  resolveHITL(approved: boolean, feedback?: string): void {
    appendEvent(this.rootDir, {
      id: generateEventId(),
      type: "HITL_RESOLVED",
      timestamp: new Date().toISOString(),
      phaseId: this.state.currentPhase,
      payload: {
        approved,
        feedback,
      },
    });
    
    if (approved) {
      this.paused = false;
    }
  }
}


