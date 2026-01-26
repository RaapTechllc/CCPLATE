/**
 * Task Orchestrator - DAG-Based Execution
 * 
 * Manages task dependencies and parallel execution.
 * Builds dependency graph and executes tasks in optimal order.
 * 
 * Key features:
 * - Topological sort for execution order
 * - Parallel execution of independent tasks
 * - Resource-aware scheduling
 * - Critical path highlighting
 */

import type { PhaseTask, PhaseDefinition } from "./tiers/beginner";

// ============================================================================
// TYPES
// ============================================================================

export interface TaskNode {
  task: PhaseTask;
  phaseId: string;
  dependencies: string[];
  dependents: string[];
  status: "pending" | "ready" | "running" | "completed" | "failed" | "blocked";
  depth: number;
  criticalPath: boolean;
  estimatedEndTime?: number;
}

export interface TaskGraph {
  nodes: Map<string, TaskNode>;
  phases: PhaseDefinition[];
  criticalPathTasks: string[];
  totalEstimatedMinutes: number;
}

export interface ExecutionPlan {
  levels: string[][];
  criticalPath: string[];
  estimatedDuration: number;
  parallelOpportunities: number;
}

export interface ResourceLimits {
  maxConcurrent: number;
  cpuLimit?: number;
  memoryLimit?: number;
}

export interface OrchestratorConfig {
  maxConcurrent: number;
  resourceLimits?: ResourceLimits;
  prioritizeCriticalPath: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrent: 3,
  prioritizeCriticalPath: true,
};

// ============================================================================
// TASK GRAPH BUILDER
// ============================================================================

/**
 * Build a task dependency graph from phases
 */
export function buildTaskGraph(phases: PhaseDefinition[]): TaskGraph {
  const nodes = new Map<string, TaskNode>();
  
  // First pass: create nodes
  for (const phase of phases) {
    for (const task of phase.tasks) {
      nodes.set(task.id, {
        task,
        phaseId: phase.id,
        dependencies: task.dependencies || [],
        dependents: [],
        status: "pending",
        depth: 0,
        criticalPath: false,
      });
    }
  }
  
  // Second pass: build dependents and validate
  for (const [id, node] of nodes) {
    for (const depId of node.dependencies) {
      const depNode = nodes.get(depId);
      if (depNode) {
        depNode.dependents.push(id);
      }
    }
  }
  
  // Calculate depths (longest path to node)
  calculateDepths(nodes);
  
  // Find critical path
  const criticalPathTasks = findCriticalPath(nodes);
  for (const taskId of criticalPathTasks) {
    const node = nodes.get(taskId);
    if (node) node.criticalPath = true;
  }
  
  // Calculate total estimated time
  let totalEstimatedMinutes = 0;
  for (const node of nodes.values()) {
    totalEstimatedMinutes += node.task.estimatedMinutes || 5;
  }
  
  return {
    nodes,
    phases,
    criticalPathTasks,
    totalEstimatedMinutes,
  };
}

function calculateDepths(nodes: Map<string, TaskNode>): void {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(id: string): number {
    if (visited.has(id)) {
      return nodes.get(id)!.depth;
    }
    
    if (visiting.has(id)) {
      // Cycle detected - shouldn't happen with valid DAG
      console.warn(`Cycle detected at task: ${id}`);
      return 0;
    }
    
    visiting.add(id);
    
    const node = nodes.get(id);
    if (!node) return 0;
    
    let maxDepth = 0;
    for (const depId of node.dependencies) {
      maxDepth = Math.max(maxDepth, visit(depId) + 1);
    }
    
    node.depth = maxDepth;
    visiting.delete(id);
    visited.add(id);
    
    return maxDepth;
  }
  
  for (const id of nodes.keys()) {
    visit(id);
  }
}

function findCriticalPath(nodes: Map<string, TaskNode>): string[] {
  // Find nodes with no dependents (end nodes)
  const endNodes = [...nodes.entries()]
    .filter(([_, node]) => node.dependents.length === 0)
    .map(([id]) => id);
  
  if (endNodes.length === 0) return [];
  
  // Calculate earliest finish times
  const finishTimes = new Map<string, number>();
  
  function getFinishTime(id: string): number {
    if (finishTimes.has(id)) {
      return finishTimes.get(id)!;
    }
    
    const node = nodes.get(id);
    if (!node) return 0;
    
    let earliestStart = 0;
    for (const depId of node.dependencies) {
      earliestStart = Math.max(earliestStart, getFinishTime(depId));
    }
    
    const finish = earliestStart + (node.task.estimatedMinutes || 5);
    finishTimes.set(id, finish);
    
    return finish;
  }
  
  // Calculate finish times for all nodes
  for (const id of nodes.keys()) {
    getFinishTime(id);
  }
  
  // Find the end node with maximum finish time
  let maxEndTime = 0;
  let maxEndNode = "";
  for (const endId of endNodes) {
    const time = finishTimes.get(endId) || 0;
    if (time > maxEndTime) {
      maxEndTime = time;
      maxEndNode = endId;
    }
  }
  
  // Trace back to find critical path
  const criticalPath: string[] = [];
  let currentId = maxEndNode;
  
  while (currentId) {
    criticalPath.unshift(currentId);
    
    const node = nodes.get(currentId);
    if (!node || node.dependencies.length === 0) break;
    
    // Find the dependency with latest finish time
    let maxDepTime = 0;
    let maxDepId = "";
    for (const depId of node.dependencies) {
      const time = finishTimes.get(depId) || 0;
      if (time > maxDepTime) {
        maxDepTime = time;
        maxDepId = depId;
      }
    }
    
    currentId = maxDepId;
  }
  
  return criticalPath;
}

// ============================================================================
// TOPOLOGICAL SORT
// ============================================================================

/**
 * Perform topological sort on tasks
 */
export function topologicalSort(graph: TaskGraph): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  function visit(id: string): boolean {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      console.warn(`Cycle detected at: ${id}`);
      return false;
    }
    
    visiting.add(id);
    
    const node = graph.nodes.get(id);
    if (node) {
      for (const depId of node.dependencies) {
        if (!visit(depId)) return false;
      }
    }
    
    visiting.delete(id);
    visited.add(id);
    result.push(id);
    
    return true;
  }
  
  for (const id of graph.nodes.keys()) {
    if (!visited.has(id)) {
      visit(id);
    }
  }
  
  return result;
}

// ============================================================================
// EXECUTION PLAN
// ============================================================================

/**
 * Generate an execution plan with parallel levels
 */
export function generateExecutionPlan(graph: TaskGraph): ExecutionPlan {
  const levels: string[][] = [];
  const scheduled = new Set<string>();
  
  while (scheduled.size < graph.nodes.size) {
    const level: string[] = [];
    
    for (const [id, node] of graph.nodes) {
      if (scheduled.has(id)) continue;
      
      // Check if all dependencies are scheduled
      const allDepsScheduled = node.dependencies.every(d => scheduled.has(d));
      if (allDepsScheduled) {
        level.push(id);
      }
    }
    
    if (level.length === 0) {
      // No more tasks can be scheduled - break to prevent infinite loop
      break;
    }
    
    levels.push(level);
    for (const id of level) {
      scheduled.add(id);
    }
  }
  
  // Calculate parallel opportunities
  let parallelOpportunities = 0;
  for (const level of levels) {
    if (level.length > 1) {
      parallelOpportunities += level.length - 1;
    }
  }
  
  // Calculate estimated duration (sum of critical path tasks)
  let estimatedDuration = 0;
  for (const taskId of graph.criticalPathTasks) {
    const node = graph.nodes.get(taskId);
    if (node) {
      estimatedDuration += node.task.estimatedMinutes || 5;
    }
  }
  
  return {
    levels,
    criticalPath: graph.criticalPathTasks,
    estimatedDuration,
    parallelOpportunities,
  };
}

// ============================================================================
// TASK ORCHESTRATOR CLASS
// ============================================================================

export class TaskOrchestrator {
  private graph: TaskGraph;
  private config: OrchestratorConfig;
  private runningTasks: Set<string>;
  private completedTasks: Set<string>;
  private failedTasks: Set<string>;
  
  constructor(phases: PhaseDefinition[], config?: Partial<OrchestratorConfig>) {
    this.graph = buildTaskGraph(phases);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.runningTasks = new Set();
    this.completedTasks = new Set();
    this.failedTasks = new Set();
  }
  
  /**
   * Get the task graph
   */
  getGraph(): TaskGraph {
    return this.graph;
  }
  
  /**
   * Get execution plan
   */
  getExecutionPlan(): ExecutionPlan {
    return generateExecutionPlan(this.graph);
  }
  
  /**
   * Get tasks ready to run
   */
  getReadyTasks(): TaskNode[] {
    const ready: TaskNode[] = [];
    
    for (const node of this.graph.nodes.values()) {
      if (this.isTaskReady(node.task.id)) {
        ready.push(node);
      }
    }
    
    // Sort by priority (critical path first, then by depth)
    if (this.config.prioritizeCriticalPath) {
      ready.sort((a, b) => {
        if (a.criticalPath && !b.criticalPath) return -1;
        if (!a.criticalPath && b.criticalPath) return 1;
        return a.depth - b.depth;
      });
    } else {
      ready.sort((a, b) => a.depth - b.depth);
    }
    
    return ready;
  }
  
  /**
   * Check if a task is ready to run
   */
  isTaskReady(taskId: string): boolean {
    if (this.completedTasks.has(taskId)) return false;
    if (this.failedTasks.has(taskId)) return false;
    if (this.runningTasks.has(taskId)) return false;
    
    const node = this.graph.nodes.get(taskId);
    if (!node) return false;
    
    // Check all dependencies are complete
    for (const depId of node.dependencies) {
      if (!this.completedTasks.has(depId)) return false;
    }
    
    return true;
  }
  
  /**
   * Check if more tasks can be started (respecting concurrency)
   */
  canStartMore(): boolean {
    return this.runningTasks.size < this.config.maxConcurrent;
  }
  
  /**
   * Get next tasks to run (respecting concurrency limits)
   */
  getNextTasks(): TaskNode[] {
    const ready = this.getReadyTasks();
    const available = this.config.maxConcurrent - this.runningTasks.size;
    return ready.slice(0, available);
  }
  
  /**
   * Mark task as started
   */
  startTask(taskId: string): boolean {
    if (!this.isTaskReady(taskId)) return false;
    
    this.runningTasks.add(taskId);
    
    const node = this.graph.nodes.get(taskId);
    if (node) {
      node.status = "running";
    }
    
    return true;
  }
  
  /**
   * Mark task as completed
   */
  completeTask(taskId: string): void {
    this.runningTasks.delete(taskId);
    this.completedTasks.add(taskId);
    
    const node = this.graph.nodes.get(taskId);
    if (node) {
      node.status = "completed";
    }
    
    // Update dependent tasks status
    this.updateDependentStatus(taskId);
  }
  
  /**
   * Mark task as failed
   */
  failTask(taskId: string): void {
    this.runningTasks.delete(taskId);
    this.failedTasks.add(taskId);
    
    const node = this.graph.nodes.get(taskId);
    if (node) {
      node.status = "failed";
    }
    
    // Mark dependent tasks as blocked
    this.blockDependentTasks(taskId);
  }
  
  /**
   * Check if all tasks are done
   */
  isComplete(): boolean {
    return this.completedTasks.size + this.failedTasks.size === this.graph.nodes.size;
  }
  
  /**
   * Get progress percentage
   */
  getProgress(): number {
    if (this.graph.nodes.size === 0) return 100;
    return Math.round((this.completedTasks.size / this.graph.nodes.size) * 100);
  }
  
  /**
   * Get status summary
   */
  getStatus(): {
    total: number;
    completed: number;
    running: number;
    failed: number;
    pending: number;
    blocked: number;
    progress: number;
  } {
    let blocked = 0;
    for (const node of this.graph.nodes.values()) {
      if (node.status === "blocked") blocked++;
    }
    
    const total = this.graph.nodes.size;
    const completed = this.completedTasks.size;
    const running = this.runningTasks.size;
    const failed = this.failedTasks.size;
    const pending = total - completed - running - failed - blocked;
    
    return {
      total,
      completed,
      running,
      failed,
      pending,
      blocked,
      progress: this.getProgress(),
    };
  }
  
  /**
   * Reset orchestrator state
   */
  reset(): void {
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.failedTasks.clear();
    
    for (const node of this.graph.nodes.values()) {
      node.status = "pending";
    }
  }
  
  /**
   * Load state from completed/failed task lists
   */
  loadState(completed: string[], failed: string[]): void {
    this.reset();
    
    for (const taskId of completed) {
      this.completedTasks.add(taskId);
      const node = this.graph.nodes.get(taskId);
      if (node) node.status = "completed";
    }
    
    for (const taskId of failed) {
      this.failedTasks.add(taskId);
      const node = this.graph.nodes.get(taskId);
      if (node) node.status = "failed";
    }
    
    // Update blocked status
    for (const taskId of failed) {
      this.blockDependentTasks(taskId);
    }
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private updateDependentStatus(taskId: string): void {
    const node = this.graph.nodes.get(taskId);
    if (!node) return;
    
    for (const depId of node.dependents) {
      const depNode = this.graph.nodes.get(depId);
      if (depNode && depNode.status === "pending") {
        if (this.isTaskReady(depId)) {
          depNode.status = "ready";
        }
      }
    }
  }
  
  private blockDependentTasks(taskId: string): void {
    const node = this.graph.nodes.get(taskId);
    if (!node) return;
    
    const toBlock = [...node.dependents];
    const blocked = new Set<string>();
    
    while (toBlock.length > 0) {
      const id = toBlock.pop()!;
      if (blocked.has(id)) continue;
      
      const depNode = this.graph.nodes.get(id);
      if (depNode && !this.completedTasks.has(id) && !this.failedTasks.has(id)) {
        depNode.status = "blocked";
        blocked.add(id);
        toBlock.push(...depNode.dependents);
      }
    }
  }
}

// ============================================================================
// VISUALIZATION HELPERS
// ============================================================================

/**
 * Format execution plan as text
 */
export function formatExecutionPlan(plan: ExecutionPlan): string {
  const lines: string[] = [];
  
  lines.push("📋 Execution Plan");
  lines.push("─".repeat(40));
  lines.push(`Total levels: ${plan.levels.length}`);
  lines.push(`Estimated duration: ${plan.estimatedDuration} minutes`);
  lines.push(`Parallel opportunities: ${plan.parallelOpportunities}`);
  lines.push("");
  
  lines.push("🎯 Critical Path:");
  lines.push(`   ${plan.criticalPath.join(" → ")}`);
  lines.push("");
  
  lines.push("📊 Execution Levels:");
  for (let i = 0; i < plan.levels.length; i++) {
    const level = plan.levels[i];
    const parallel = level.length > 1 ? " (parallel)" : "";
    lines.push(`   Level ${i + 1}${parallel}: ${level.join(", ")}`);
  }
  
  return lines.join("\n");
}

/**
 * Format task graph as Mermaid diagram
 */
export function formatGraphAsMermaid(graph: TaskGraph): string {
  const lines: string[] = ["graph TD"];
  
  // Add nodes with styling
  for (const [id, node] of graph.nodes) {
    const label = node.task.description.slice(0, 30);
    const style = node.criticalPath ? ":::critical" : "";
    lines.push(`    ${id}["${label}"]${style}`);
  }
  
  // Add edges
  for (const [id, node] of graph.nodes) {
    for (const depId of node.dependencies) {
      lines.push(`    ${depId} --> ${id}`);
    }
  }
  
  // Add styling
  lines.push("");
  lines.push("    classDef critical fill:#ff6b6b,stroke:#c92a2a,color:#fff");
  
  return lines.join("\n");
}
