import { describe, it, expect } from "vitest";
import {
  TaskOrchestrator,
  buildTaskGraph,
  topologicalSort,
  generateExecutionPlan,
  formatExecutionPlan,
  formatGraphAsMermaid,
} from "../../../src/lib/guardian/task-orchestrator";
import type { PhaseDefinition } from "../../../src/lib/guardian/tiers/beginner";

const samplePhases: PhaseDefinition[] = [
  {
    id: "foundation",
    name: "Foundation",
    description: "Setup",
    emoji: "🏗️",
    tasks: [
      { id: "task-a", description: "Init project", estimatedMinutes: 5 },
      { id: "task-b", description: "Setup auth", estimatedMinutes: 10, dependencies: ["task-a"] },
      { id: "task-c", description: "Setup DB", estimatedMinutes: 8, dependencies: ["task-a"] },
      { id: "task-d", description: "Connect all", estimatedMinutes: 5, dependencies: ["task-b", "task-c"] },
    ],
    transitionGate: {
      type: "all_tasks",
      minCompletionPercent: 100,
    },
    hitlCheckpoint: {
      type: "demo",
      prompt: "Review",
    },
  },
];

describe("Task Orchestrator", () => {
  describe("Task Graph Building", () => {
    it("should build task graph from phases", () => {
      const graph = buildTaskGraph(samplePhases);
      
      expect(graph.nodes.size).toBe(4);
      expect(graph.phases).toHaveLength(1);
    });

    it("should calculate task depths correctly", () => {
      const graph = buildTaskGraph(samplePhases);
      
      const taskA = graph.nodes.get("task-a");
      const taskB = graph.nodes.get("task-b");
      const taskD = graph.nodes.get("task-d");
      
      expect(taskA?.depth).toBe(0);
      expect(taskB?.depth).toBe(1);
      expect(taskD?.depth).toBe(2);
    });

    it("should identify critical path", () => {
      const graph = buildTaskGraph(samplePhases);
      
      expect(graph.criticalPathTasks).toContain("task-a");
      expect(graph.criticalPathTasks).toContain("task-d");
    });

    it("should track dependents", () => {
      const graph = buildTaskGraph(samplePhases);
      
      const taskA = graph.nodes.get("task-a");
      expect(taskA?.dependents).toContain("task-b");
      expect(taskA?.dependents).toContain("task-c");
    });
  });

  describe("Topological Sort", () => {
    it("should sort tasks in valid execution order", () => {
      const graph = buildTaskGraph(samplePhases);
      const sorted = topologicalSort(graph);
      
      // task-a must come before task-b and task-c
      const indexA = sorted.indexOf("task-a");
      const indexB = sorted.indexOf("task-b");
      const indexC = sorted.indexOf("task-c");
      const indexD = sorted.indexOf("task-d");
      
      expect(indexA).toBeLessThan(indexB);
      expect(indexA).toBeLessThan(indexC);
      expect(indexB).toBeLessThan(indexD);
      expect(indexC).toBeLessThan(indexD);
    });
  });

  describe("Execution Plan", () => {
    it("should generate execution plan with levels", () => {
      const graph = buildTaskGraph(samplePhases);
      const plan = generateExecutionPlan(graph);
      
      expect(plan.levels.length).toBeGreaterThan(0);
      
      // First level should only have task-a (no dependencies)
      expect(plan.levels[0]).toContain("task-a");
      
      // Second level should have task-b and task-c (parallel)
      expect(plan.levels[1]).toContain("task-b");
      expect(plan.levels[1]).toContain("task-c");
      
      // Last level should have task-d
      expect(plan.levels[2]).toContain("task-d");
    });

    it("should identify parallel opportunities", () => {
      const graph = buildTaskGraph(samplePhases);
      const plan = generateExecutionPlan(graph);
      
      // task-b and task-c can run in parallel
      expect(plan.parallelOpportunities).toBeGreaterThan(0);
    });

    it("should calculate estimated duration", () => {
      const graph = buildTaskGraph(samplePhases);
      const plan = generateExecutionPlan(graph);
      
      expect(plan.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe("Task Orchestrator Class", () => {
    it("should initialize correctly", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      const status = orchestrator.getStatus();
      expect(status.total).toBe(4);
      expect(status.completed).toBe(0);
      expect(status.running).toBe(0);
      expect(status.progress).toBe(0);
    });

    it("should identify ready tasks", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      const ready = orchestrator.getReadyTasks();
      
      // Only task-a should be ready initially
      expect(ready).toHaveLength(1);
      expect(ready[0].task.id).toBe("task-a");
    });

    it("should start and complete tasks", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      orchestrator.startTask("task-a");
      expect(orchestrator.getStatus().running).toBe(1);
      
      orchestrator.completeTask("task-a");
      expect(orchestrator.getStatus().completed).toBe(1);
      expect(orchestrator.getStatus().running).toBe(0);
      
      // Now task-b and task-c should be ready
      const ready = orchestrator.getReadyTasks();
      expect(ready).toHaveLength(2);
    });

    it("should handle task failures", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      orchestrator.startTask("task-a");
      orchestrator.failTask("task-a");
      
      expect(orchestrator.getStatus().failed).toBe(1);
      
      // Dependent tasks should be blocked
      const ready = orchestrator.getReadyTasks();
      expect(ready).toHaveLength(0);
    });

    it("should respect concurrency limits", () => {
      const orchestrator = new TaskOrchestrator(samplePhases, { maxConcurrent: 1 });
      
      orchestrator.startTask("task-a");
      orchestrator.completeTask("task-a");
      
      // Both b and c are ready, but only 1 can start due to limit
      const nextTasks = orchestrator.getNextTasks();
      expect(nextTasks).toHaveLength(1);
    });

    it("should track progress percentage", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      expect(orchestrator.getProgress()).toBe(0);
      
      orchestrator.startTask("task-a");
      orchestrator.completeTask("task-a");
      
      expect(orchestrator.getProgress()).toBe(25); // 1/4 = 25%
      
      orchestrator.startTask("task-b");
      orchestrator.completeTask("task-b");
      orchestrator.startTask("task-c");
      orchestrator.completeTask("task-c");
      
      expect(orchestrator.getProgress()).toBe(75); // 3/4 = 75%
    });

    it("should check completion", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      expect(orchestrator.isComplete()).toBe(false);
      
      orchestrator.startTask("task-a");
      orchestrator.completeTask("task-a");
      orchestrator.startTask("task-b");
      orchestrator.completeTask("task-b");
      orchestrator.startTask("task-c");
      orchestrator.completeTask("task-c");
      orchestrator.startTask("task-d");
      orchestrator.completeTask("task-d");
      
      expect(orchestrator.isComplete()).toBe(true);
    });

    it("should reset state", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      orchestrator.startTask("task-a");
      orchestrator.completeTask("task-a");
      
      orchestrator.reset();
      
      expect(orchestrator.getStatus().completed).toBe(0);
      expect(orchestrator.getProgress()).toBe(0);
    });

    it("should load state from completed/failed lists", () => {
      const orchestrator = new TaskOrchestrator(samplePhases);
      
      orchestrator.loadState(["task-a", "task-b"], ["task-c"]);
      
      const status = orchestrator.getStatus();
      expect(status.completed).toBe(2);
      expect(status.failed).toBe(1);
      expect(status.blocked).toBe(1); // task-d is blocked by failed task-c
    });
  });

  describe("Formatting", () => {
    it("should format execution plan as text", () => {
      const graph = buildTaskGraph(samplePhases);
      const plan = generateExecutionPlan(graph);
      
      const formatted = formatExecutionPlan(plan);
      
      expect(formatted).toContain("Execution Plan");
      expect(formatted).toContain("Critical Path");
      expect(formatted).toContain("Level 1");
    });

    it("should format graph as Mermaid", () => {
      const graph = buildTaskGraph(samplePhases);
      
      const mermaid = formatGraphAsMermaid(graph);
      
      expect(mermaid).toContain("graph TD");
      expect(mermaid).toContain("task-a");
      expect(mermaid).toContain("-->");
    });
  });
});
