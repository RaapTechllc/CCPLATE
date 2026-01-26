import { describe, it, expect } from "vitest";
import {
  BEGINNER_QUESTIONS,
  BEGINNER_CONDITIONAL_QUESTIONS,
  getApplicableQuestions,
  deriveBeginnerPRD,
  generatePhases,
  createInitialRalphState,
  evaluatePhaseTransition,
  COMMON_ERROR_PATTERNS,
  type BeginnerAnswers,
} from "../../../../src/lib/guardian/tiers/beginner";

describe("Beginner Tier Questions", () => {
  it("should have all required core questions", () => {
    const requiredKeys = [
      "projectType",
      "primaryFeature", 
      "userAuth",
      "dataStorage",
      "timeline",
      "projectDescription",
    ];
    
    for (const key of requiredKeys) {
      const question = BEGINNER_QUESTIONS.find(q => q.key === key);
      expect(question).toBeDefined();
      expect(question?.required).toBe(true);
    }
  });

  it("should have conditional questions with conditions", () => {
    expect(BEGINNER_CONDITIONAL_QUESTIONS.length).toBeGreaterThan(0);
    
    for (const q of BEGINNER_CONDITIONAL_QUESTIONS) {
      expect(q.condition).toBeDefined();
    }
  });

  it("should return applicable questions based on answers", () => {
    // E-commerce should trigger paymentProvider question
    const ecommerceAnswers: Record<string, unknown> = {
      projectType: "ecommerce",
      primaryFeature: "commerce",
      userAuth: "email",
      dataStorage: "heavy",
    };
    
    const questions = getApplicableQuestions(ecommerceAnswers);
    const hasPaymentQuestion = questions.some(q => q.key === "paymentProvider");
    expect(hasPaymentQuestion).toBe(true);
  });

  it("should not show paymentProvider for landing page", () => {
    const landingAnswers: Record<string, unknown> = {
      projectType: "landing",
      primaryFeature: "content",
      userAuth: "none",
      dataStorage: "none",
    };
    
    const questions = getApplicableQuestions(landingAnswers);
    const hasPaymentQuestion = questions.some(q => q.key === "paymentProvider");
    expect(hasPaymentQuestion).toBe(false);
  });
});

describe("PRD Derivation", () => {
  const sampleAnswers: BeginnerAnswers = {
    projectType: "webapp",
    primaryFeature: "create",
    userAuth: "email",
    dataStorage: "heavy",
    timeline: "week",
    projectDescription: "A recipe sharing app where users can save and organize their favorite cooking recipes",
  };

  it("should extract project name from description", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    expect(prd.projectName).toBeTruthy();
    expect(prd.projectName.length).toBeGreaterThan(3);
  });

  it("should infer entities from description", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    expect(prd.keyEntities).toContain("recipe");
    expect(prd.keyEntities).toContain("user");
  });

  it("should assess complexity correctly", () => {
    const simplePRD = deriveBeginnerPRD({
      ...sampleAnswers,
      projectType: "landing",
      primaryFeature: "content",
      userAuth: "none",
      dataStorage: "none",
    });
    expect(simplePRD.estimatedComplexity).toBe("simple");

    const complexPRD = deriveBeginnerPRD({
      ...sampleAnswers,
      projectType: "saas",
      primaryFeature: "commerce",
      userAuth: "both",
      dataStorage: "heavy",
      paymentProvider: "stripe",
    });
    expect(complexPRD.estimatedComplexity).toBe("complex");
  });

  it("should generate Convex schema hints", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    expect(prd.convexSchema.length).toBeGreaterThan(0);
    
    // Should have users table for auth
    const usersTable = prd.convexSchema.find(s => s.tableName === "users");
    expect(usersTable).toBeDefined();
    
    // Should have recipe table based on description
    const recipesTable = prd.convexSchema.find(s => s.tableName === "recipes");
    expect(recipesTable).toBeDefined();
  });

  it("should derive success criteria", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    expect(prd.successCriteria.length).toBeGreaterThan(0);
    expect(prd.successCriteria.some(c => c.includes("sign up"))).toBe(true);
  });

  it("should derive critical paths", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    expect(prd.criticalPaths.length).toBeGreaterThan(0);
  });
});

describe("Phase Generation", () => {
  const sampleAnswers: BeginnerAnswers = {
    projectType: "webapp",
    primaryFeature: "create",
    userAuth: "email",
    dataStorage: "heavy",
    timeline: "week",
    projectDescription: "A recipe sharing app",
  };

  it("should generate correct number of phases based on complexity", () => {
    const simplePRD = deriveBeginnerPRD({
      ...sampleAnswers,
      projectType: "landing",
      primaryFeature: "content",
      userAuth: "none",
      dataStorage: "none",
    });
    const simplePhases = generatePhases(simplePRD);
    expect(simplePhases.length).toBe(3); // Foundation, Core, Deploy

    const moderatePRD = deriveBeginnerPRD(sampleAnswers);
    const moderatePhases = generatePhases(moderatePRD);
    expect(moderatePhases.length).toBeGreaterThanOrEqual(4);
  });

  it("should always have foundation and deploy phases", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    const phases = generatePhases(prd);
    
    expect(phases[0].id).toBe("foundation");
    expect(phases[phases.length - 1].id).toBe("deploy");
  });

  it("should generate tasks with validation commands", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    const phases = generatePhases(prd);
    
    const foundationTasks = phases[0].tasks;
    expect(foundationTasks.some(t => t.validationCommand)).toBe(true);
  });

  it("should include HITL checkpoints", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    const phases = generatePhases(prd);
    
    for (const phase of phases) {
      expect(phase.hitlCheckpoint).toBeDefined();
      expect(phase.hitlCheckpoint.type).toBeDefined();
      expect(phase.hitlCheckpoint.prompt).toBeTruthy();
    }
  });
});

describe("Ralph Loop State", () => {
  const sampleAnswers: BeginnerAnswers = {
    projectType: "webapp",
    primaryFeature: "create",
    userAuth: "email",
    dataStorage: "heavy",
    timeline: "week",
    projectDescription: "A recipe sharing app",
  };

  it("should create initial state correctly", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    const phases = generatePhases(prd);
    const state = createInitialRalphState(phases);
    
    expect(state.currentPhase).toBe("foundation");
    expect(state.tasksCompleted).toEqual([]);
    expect(state.iteration).toBe(0);
    expect(state.metrics.totalIterations).toBe(0);
  });

  it("should evaluate phase transition correctly", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    const phases = generatePhases(prd);
    const state = createInitialRalphState(phases);
    
    // With no tasks complete, should not transition
    const result = evaluatePhaseTransition(state, phases[0]);
    expect(result.shouldTransition).toBe(false);
    expect(result.blockers?.length).toBeGreaterThan(0);
  });

  it("should transition when required tasks complete", () => {
    const prd = deriveBeginnerPRD(sampleAnswers);
    const phases = generatePhases(prd);
    const state = createInitialRalphState(phases);
    
    // Mark all tasks as complete
    state.tasksCompleted = phases[0].tasks.map(t => t.id);
    
    const result = evaluatePhaseTransition(state, phases[0]);
    expect(result.shouldTransition).toBe(true);
  });
});

describe("Error Pattern Recognition", () => {
  it("should have common error patterns defined", () => {
    expect(Object.keys(COMMON_ERROR_PATTERNS).length).toBeGreaterThan(0);
  });

  it("should match missing import errors", () => {
    const pattern = COMMON_ERROR_PATTERNS.missingImport;
    const error = "Cannot find module 'react-query'";
    expect(pattern.regex.test(error)).toBe(true);
  });

  it("should match hydration errors", () => {
    const pattern = COMMON_ERROR_PATTERNS.hydrationMismatch;
    const error = "Hydration failed because the initial UI does not match";
    expect(pattern.regex.test(error)).toBe(true);
  });

  it("should match Convex schema errors", () => {
    const pattern = COMMON_ERROR_PATTERNS.convexSchemaError;
    const error = "Schema validation failed for table users";
    expect(pattern.regex.test(error)).toBe(true);
  });
});
