import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import {
  RalphEngine,
  loadEvents,
  loadCheckpoint,
  clearEvents,
  clearCheckpoint,
  appendEvent,
  replayEvents,
  generateEventId,
  type WorkflowEvent,
} from "../../../src/lib/guardian/ralph-engine";
import type { PhaseDefinition, RalphLoopState, DerivedPRD } from "../../../src/lib/guardian/tiers/beginner";

const TEST_DIR = join(process.cwd(), "test-fixtures", "ralph-engine");

// Sample test data
const samplePRD: DerivedPRD = {
  projectName: "Test App",
  targetUser: "Test users",
  jobsToBeDone: ["Test feature"],
  successCriteria: ["Tests pass"],
  criticalPaths: ["Main flow"],
  nonGoals: ["Not needed"],
  risks: [],
  techStack: {
    frontend: "Next.js",
    backend: "Convex",
    database: "Convex",
    auth: "Convex Auth",
    hosting: "Vercel",
    additional: [],
  },
  keyEntities: ["user"],
  estimatedComplexity: "simple",
  convexSchema: [],
};

const samplePhases: PhaseDefinition[] = [
  {
    id: "foundation",
    name: "Foundation",
    description: "Setup",
    emoji: "🏗️",
    tasks: [
      { id: "task-1", description: "First task", estimatedMinutes: 5 },
      { id: "task-2", description: "Second task", estimatedMinutes: 5, dependencies: ["task-1"] },
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
  {
    id: "deploy",
    name: "Deploy",
    description: "Deploy to prod",
    emoji: "🚀",
    tasks: [
      { id: "task-3", description: "Deploy", estimatedMinutes: 5, dependencies: ["task-2"] },
    ],
    transitionGate: {
      type: "build_pass",
      minCompletionPercent: 100,
    },
    hitlCheckpoint: {
      type: "approve",
      prompt: "Approve deploy?",
    },
  },
];

describe("Ralph Engine", () => {
  beforeEach(() => {
    // Create test directory
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(join(TEST_DIR, "memory"), { recursive: true });
    
    // Clear any existing state
    clearEvents(TEST_DIR);
    clearCheckpoint(TEST_DIR);
  });

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("Event Operations", () => {
    it("should generate unique event IDs", () => {
      const id1 = generateEventId();
      const id2 = generateEventId();
      
      expect(id1).toMatch(/^evt-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^evt-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it("should append and load events", () => {
      const event: WorkflowEvent = {
        id: generateEventId(),
        type: "TASK_STARTED",
        timestamp: new Date().toISOString(),
        taskId: "task-1",
        payload: { description: "Test task" },
      };
      
      appendEvent(TEST_DIR, event);
      
      const events = loadEvents(TEST_DIR);
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(event.id);
      expect(events[0].type).toBe("TASK_STARTED");
    });

    it("should clear events", () => {
      appendEvent(TEST_DIR, {
        id: generateEventId(),
        type: "WORKFLOW_STARTED",
        timestamp: new Date().toISOString(),
        payload: {},
      });
      
      expect(loadEvents(TEST_DIR)).toHaveLength(1);
      
      clearEvents(TEST_DIR);
      
      expect(loadEvents(TEST_DIR)).toHaveLength(0);
    });
  });

  describe("State Reconstruction", () => {
    it("should replay events to reconstruct state", () => {
      const initialState: RalphLoopState = {
        currentPhase: "foundation",
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

      const events: WorkflowEvent[] = [
        {
          id: "evt-1",
          type: "TASK_STARTED",
          timestamp: new Date().toISOString(),
          taskId: "task-1",
          payload: {},
        },
        {
          id: "evt-2",
          type: "TASK_COMPLETED",
          timestamp: new Date().toISOString(),
          taskId: "task-1",
          payload: { durationMs: 5000 },
        },
      ];

      const state = replayEvents(events, initialState);

      expect(state.tasksCompleted).toContain("task-1");
      expect(state.currentTask).toBeNull();
      expect(state.metrics.totalIterations).toBe(1);
    });

    it("should track error patterns from events", () => {
      const initialState: RalphLoopState = {
        currentPhase: "foundation",
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

      const events: WorkflowEvent[] = [
        {
          id: "evt-1",
          type: "ERROR_DETECTED",
          timestamp: new Date().toISOString(),
          payload: { pattern: "Module not found" },
        },
        {
          id: "evt-2",
          type: "ERROR_DETECTED",
          timestamp: new Date().toISOString(),
          payload: { pattern: "Module not found" },
        },
      ];

      const state = replayEvents(events, initialState);

      expect(state.errorPatterns).toHaveLength(1);
      expect(state.errorPatterns[0].pattern).toBe("Module not found");
      expect(state.errorPatterns[0].occurrences).toBe(2);
    });
  });

  describe("Checkpoint Operations", () => {
    it("should save and load checkpoints", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      const checkpoint = engine.checkpoint();
      
      expect(checkpoint.id).toMatch(/^ckpt-\d+-[a-z0-9]+$/);
      expect(checkpoint.state.currentPhase).toBe("foundation");
      
      const loaded = loadCheckpoint(TEST_DIR);
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(checkpoint.id);
    });

    it("should clear checkpoints", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      engine.checkpoint();
      
      expect(loadCheckpoint(TEST_DIR)).not.toBeNull();
      
      clearCheckpoint(TEST_DIR);
      
      // After clearing, the file exists but is empty
      const checkpoint = loadCheckpoint(TEST_DIR);
      expect(checkpoint).toBeNull();
    });
  });

  describe("Engine Lifecycle", () => {
    it("should initialize with correct state", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      const state = engine.getState();
      expect(state.currentPhase).toBe("foundation");
      expect(state.tasksCompleted).toHaveLength(0);
      expect(state.iteration).toBe(0);
    });

    it("should resume from checkpoint", () => {
      // Create engine and make some progress
      const engine1 = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      // Manually add some events
      appendEvent(TEST_DIR, {
        id: generateEventId(),
        type: "TASK_COMPLETED",
        timestamp: new Date().toISOString(),
        taskId: "task-1",
        phaseId: "foundation",
        payload: {},
      });
      
      // Save checkpoint
      engine1.checkpoint();
      
      // Resume
      const engine2 = RalphEngine.resume(TEST_DIR);
      
      expect(engine2).not.toBeNull();
      expect(engine2!.getState().currentPhase).toBe("foundation");
    });

    it("should get current phase", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      const phase = engine.getCurrentPhase();
      expect(phase).toBeDefined();
      expect(phase!.id).toBe("foundation");
      expect(phase!.name).toBe("Foundation");
    });

    it("should pause and check paused state", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      expect(engine.isPaused()).toBe(false);
      
      engine.pause();
      
      expect(engine.isPaused()).toBe(true);
    });
  });

  describe("Build and Test Recording", () => {
    it("should record build results", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      engine.recordBuild(true, "Build successful");
      
      const events = loadEvents(TEST_DIR);
      const buildEvent = events.find(e => e.type === "BUILD_OUTPUT");
      
      expect(buildEvent).toBeDefined();
      expect(buildEvent!.payload.success).toBe(true);
    });

    it("should record test results", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      engine.recordTest(true, "auth.test.ts", { testsCount: 5, failures: 0 });
      
      const events = loadEvents(TEST_DIR);
      const testEvent = events.find(e => e.type === "TEST_RESULT");
      
      expect(testEvent).toBeDefined();
      expect(testEvent!.payload.passed).toBe(true);
      expect(testEvent!.payload.testName).toBe("auth.test.ts");
      expect(testEvent!.payload.testsCount).toBe(5);
    });
  });

  describe("HITL Integration", () => {
    it("should request HITL and pause", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      engine.requestHITL("Phase complete review", { phase: "foundation" });
      
      expect(engine.isPaused()).toBe(true);
      
      const events = loadEvents(TEST_DIR);
      const hitlEvent = events.find(e => e.type === "HITL_REQUESTED");
      
      expect(hitlEvent).toBeDefined();
      expect(hitlEvent!.payload.reason).toBe("Phase complete review");
    });

    it("should resolve HITL and unpause", () => {
      const engine = new RalphEngine(TEST_DIR, samplePhases, samplePRD);
      
      engine.requestHITL("Review");
      expect(engine.isPaused()).toBe(true);
      
      engine.resolveHITL(true, "Looks good");
      expect(engine.isPaused()).toBe(false);
      
      const events = loadEvents(TEST_DIR);
      const resolveEvent = events.find(e => e.type === "HITL_RESOLVED");
      
      expect(resolveEvent).toBeDefined();
      expect(resolveEvent!.payload.approved).toBe(true);
    });
  });
});
