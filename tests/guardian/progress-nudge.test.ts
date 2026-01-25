/**
 * TDD Tests for Progress Nudge Evaluation
 *
 * Tests for evaluateProgressNudge() function in progress-nudge.ts
 * This function determines when to nudge the agent back on track.
 */

import { describe, it, expect } from 'vitest'
import type { PRD, PRDAnswers } from '../../src/lib/guardian/prd'
import {
  evaluateProgressNudge,
  type ProgressNudgeConfig,
  type WorkflowStateWithFiles,
} from '../../src/lib/guardian/progress-nudge'

// Helper to create a minimal PRD for testing
function createTestPRD(overrides: Partial<PRDAnswers> = {}): PRD {
  const defaultAnswers: PRDAnswers = {
    projectName: 'Test Project',
    techStack: {
      frontend: 'Next.js',
      backend: 'Node.js',
      database: 'PostgreSQL',
      auth: 'NextAuth',
      hosting: 'Vercel',
    },
    targetUser: 'Developers',
    jobsToBeDone: ['View markets', 'Place trades'],
    successCriteria: ['Authentication works', 'Search is fast'],
    criticalPaths: ['OAuth login flow', 'Dashboard view', 'Market search'],
    nonGoals: [],
    timeline: '2 weeks',
    riskAssumptions: [],
  }

  return {
    metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      hash: 'test-hash',
      frozen: true,
    },
    answers: { ...defaultAnswers, ...overrides },
  }
}

function createDefaultConfig(): ProgressNudgeConfig {
  return {
    enabled: true,
    sensitivity: 0.4, // 40% threshold
    minFilesBeforeCheck: 3,
    whitelist: [],
  }
}

describe('evaluateProgressNudge', () => {
  describe('returns null when disabled', () => {
    it('returns null when progress.enabled is false', () => {
      const prd = createTestPRD()
      const state: WorkflowStateWithFiles = {
        recent_files_changed: ['src/unrelated/foo.ts', 'src/unrelated/bar.ts', 'src/unrelated/baz.ts'],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.enabled = false

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull()
    })
  })

  describe('returns null when PRD is null', () => {
    it('returns null when PRD is null', () => {
      const state: WorkflowStateWithFiles = {
        recent_files_changed: ['src/unrelated/foo.ts'],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(null, state, config)

      expect(result).toBeNull()
    })
  })

  describe('returns null when all files are relevant', () => {
    it('returns null when 100% of files are relevant', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow', 'Dashboard view'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/auth/login.ts',
          'src/components/Dashboard.tsx',
          'src/features/auth/session.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull()
    })

    it('returns null when relevance is above threshold', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/auth.ts', // relevant
          'src/lib/auth-utils.ts', // relevant
          'src/lib/unrelated.ts', // not relevant
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.sensitivity = 0.4 // 40% threshold, 66% relevant - should pass

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull()
    })
  })

  describe('returns nudge when files are off-track', () => {
    it('returns nudge when <40% files are relevant', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/billing/payment.ts',
          'src/lib/billing/invoice.ts',
          'src/lib/billing/subscription.ts',
          'src/lib/billing/refund.ts',
          'src/lib/auth.ts', // only 1 relevant out of 5 = 20%
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.sensitivity = 0.4

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('progress')
      expect(result?.message).toContain('off-track')
    })

    it('includes relevant context in nudge message', () => {
      const prd = createTestPRD({
        criticalPaths: ['Dashboard view'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/analytics/tracking.ts',
          'src/lib/analytics/events.ts',
          'src/lib/analytics/metrics.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).not.toBeNull()
      expect(result?.message).toContain('Dashboard')
      // Should mention the percentage or count
      expect(result?.message).toMatch(/(\d+%|0 of \d+)/)
    })
  })

  describe('respects minFilesBeforeCheck', () => {
    it('returns null when fewer than minFilesBeforeCheck changed', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/unrelated/foo.ts',
          'src/unrelated/bar.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.minFilesBeforeCheck = 3 // Requires 3 files, only 2 changed

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull()
    })

    it('checks relevance when minFilesBeforeCheck is met', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/unrelated/foo.ts',
          'src/unrelated/bar.ts',
          'src/unrelated/baz.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.minFilesBeforeCheck = 3

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).not.toBeNull() // Should nudge because 0% relevant
    })
  })

  describe('respects whitelist patterns', () => {
    it('counts whitelisted files as relevant', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/analytics/tracking.ts',
          'src/lib/analytics/events.ts',
          'tests/analytics.test.ts', // whitelisted
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      // 1 out of 3 files relevant (test file) = 33%, below 40% threshold
      // But wait - test files are ALWAYS relevant, so they don't trigger nudge alone
      // Actually, test files being relevant means 1/3 = 33%, which is below 40%
      // The nudge SHOULD fire, but the logic might vary
      // Let's clarify: whitelisted files count as relevant for the ratio
      expect(result).not.toBeNull() // 33% < 40%
    })

    it('includes memory/** files as relevant', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'memory/workflow-state.json',
          'memory/guardian-state.json',
          'memory/context-ledger.json',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull() // All memory files are relevant
    })

    it('includes .claude/** files as relevant', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          '.claude/agents/new-agent.md',
          '.claude/rules/custom.md',
          '.claude/hooks/hook.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull() // All .claude files are relevant
    })

    it('respects custom whitelist patterns from config', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/shared/utils.ts',
          'src/shared/types.ts',
          'src/shared/constants.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.whitelist = ['src/shared/']

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull() // All files match custom whitelist
    })
  })

  describe('sensitivity configuration', () => {
    it('uses custom sensitivity threshold', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/auth.ts', // relevant
          'src/lib/unrelated.ts',
          'src/lib/other.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.sensitivity = 0.2 // Only require 20% relevant

      const result = evaluateProgressNudge(prd, state, config)

      // 1/3 = 33%, which is above 20% threshold
      expect(result).toBeNull()
    })

    it('strict sensitivity catches more deviations', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/auth.ts', // relevant
          'src/lib/auth-utils.ts', // relevant
          'src/lib/unrelated.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()
      config.sensitivity = 0.8 // Require 80% relevant

      const result = evaluateProgressNudge(prd, state, config)

      // 2/3 = 66%, which is below 80% threshold
      expect(result).not.toBeNull()
    })
  })

  describe('empty state handling', () => {
    it('returns null when no files changed', () => {
      const prd = createTestPRD()
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull()
    })

    it('handles undefined recent_files_changed', () => {
      const prd = createTestPRD()
      const state = {
        session_id: 'test-session',
      } as WorkflowStateWithFiles

      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result).toBeNull()
    })
  })

  describe('message formatting', () => {
    it('includes relevant PRD keywords in suggestion', () => {
      const prd = createTestPRD({
        criticalPaths: ['OAuth authentication', 'User dashboard'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/billing/payment.ts',
          'src/lib/billing/invoice.ts',
          'src/lib/billing/subscription.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      expect(result?.message).toMatch(/(OAuth|authentication|User|dashboard)/i)
    })

    it('uses emoji prefix for visibility', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth'],
      })
      const state: WorkflowStateWithFiles = {
        recent_files_changed: [
          'src/lib/billing/payment.ts',
          'src/lib/billing/invoice.ts',
          'src/lib/billing/subscription.ts',
        ],
        session_id: 'test-session',
      }
      const config = createDefaultConfig()

      const result = evaluateProgressNudge(prd, state, config)

      // Should have some kind of warning indicator
      expect(result?.message).toMatch(/^[^\w]/)
    })
  })
})
