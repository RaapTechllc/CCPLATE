/**
 * TDD Tests for PRD Keyword Extraction
 *
 * Tests for extractRelevantKeywords() function in prd.ts
 * This function extracts keywords from the PRD to determine file relevance.
 */

import { describe, it, expect } from 'vitest'
import { extractRelevantKeywords } from '../../src/lib/guardian/prd'
import type { PRD, PRDAnswers } from '../../src/lib/guardian/prd'

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
    jobsToBeDone: [],
    successCriteria: [],
    criticalPaths: [],
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

describe('extractRelevantKeywords', () => {
  describe('extracts keywords from criticalPaths', () => {
    it('extracts keywords from "OAuth login flow"', () => {
      const prd = createTestPRD({
        criticalPaths: ['OAuth login flow'],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('oauth')
      expect(keywords).toContain('login')
      // "flow" is too generic, may or may not be included
    })

    it('extracts keywords from "User registration with email verification"', () => {
      const prd = createTestPRD({
        criticalPaths: ['User registration with email verification'],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('user')
      expect(keywords).toContain('registration')
      expect(keywords).toContain('email')
      expect(keywords).toContain('verification')
    })

    it('extracts keywords from multiple critical paths', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth flow', 'Dashboard view', 'Settings page'],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('auth')
      expect(keywords).toContain('dashboard')
      expect(keywords).toContain('settings')
    })
  })

  describe('extracts keywords from techStack', () => {
    it('extracts framework names', () => {
      const prd = createTestPRD({
        techStack: {
          frontend: 'Next.js 14',
          backend: 'Express',
          database: 'PostgreSQL',
          auth: 'Clerk',
          hosting: 'Vercel',
        },
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('next')
      expect(keywords).toContain('express')
      expect(keywords).toContain('postgresql')
      expect(keywords).toContain('clerk')
    })

    it('handles compound tech stack names', () => {
      const prd = createTestPRD({
        techStack: {
          frontend: 'React with Redux',
          backend: 'NestJS',
          database: 'MongoDB',
          auth: 'Auth0',
          hosting: 'AWS Lambda',
        },
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('react')
      expect(keywords).toContain('redux')
      expect(keywords).toContain('nestjs')
      expect(keywords).toContain('mongodb')
      expect(keywords).toContain('auth0')
    })
  })

  describe('extracts keywords from jobsToBeDone', () => {
    it('extracts action verbs and nouns', () => {
      const prd = createTestPRD({
        jobsToBeDone: ['Search for markets', 'View market details', 'Place bets'],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('search')
      expect(keywords).toContain('market')
      expect(keywords).toContain('markets')
      expect(keywords).toContain('bets')
    })
  })

  describe('extracts keywords from successCriteria', () => {
    it('extracts technical terms from success criteria', () => {
      const prd = createTestPRD({
        successCriteria: [
          'API response time under 200ms',
          'Authentication works correctly',
          'Cache invalidation is reliable',
        ],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).toContain('api')
      expect(keywords).toContain('authentication')
      expect(keywords).toContain('cache')
    })
  })

  describe('handles edge cases', () => {
    it('handles null PRD gracefully', () => {
      const keywords = extractRelevantKeywords(null)

      expect(keywords).toEqual([])
    })

    it('handles undefined PRD gracefully', () => {
      const keywords = extractRelevantKeywords(undefined as unknown as PRD | null)

      expect(keywords).toEqual([])
    })

    it('handles empty PRD fields', () => {
      const prd = createTestPRD({
        criticalPaths: [],
        jobsToBeDone: [],
        successCriteria: [],
      })

      const keywords = extractRelevantKeywords(prd)

      // Should still have tech stack keywords
      expect(keywords.length).toBeGreaterThan(0)
      expect(keywords).toContain('next')
    })

    it('handles PRD with only empty strings', () => {
      const prd = createTestPRD({
        criticalPaths: ['', '  ', '\t'],
        jobsToBeDone: ['', ''],
      })

      const keywords = extractRelevantKeywords(prd)

      // Should not contain empty strings
      expect(keywords).not.toContain('')
      expect(keywords).not.toContain('  ')
    })
  })

  describe('deduplicates keywords', () => {
    it('removes duplicate keywords', () => {
      const prd = createTestPRD({
        criticalPaths: ['Auth login flow', 'Auth logout flow'],
        successCriteria: ['Auth works correctly'],
      })

      const keywords = extractRelevantKeywords(prd)

      // Count occurrences of 'auth'
      const authCount = keywords.filter((k) => k === 'auth').length

      expect(authCount).toBe(1)
    })

    it('normalizes to lowercase before deduplication', () => {
      const prd = createTestPRD({
        criticalPaths: ['OAuth flow', 'OAUTH integration'],
      })

      const keywords = extractRelevantKeywords(prd)

      const oauthCount = keywords.filter((k) => k === 'oauth').length

      expect(oauthCount).toBe(1)
    })
  })

  describe('filters common stop words', () => {
    it('excludes common stop words', () => {
      const prd = createTestPRD({
        criticalPaths: ['The user can login and view the dashboard'],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).not.toContain('the')
      expect(keywords).not.toContain('can')
      expect(keywords).not.toContain('and')
      expect(keywords).toContain('user')
      expect(keywords).toContain('login')
      expect(keywords).toContain('dashboard')
    })

    it('excludes short words (2 chars or less)', () => {
      const prd = createTestPRD({
        criticalPaths: ['As a user I want to login'],
      })

      const keywords = extractRelevantKeywords(prd)

      expect(keywords).not.toContain('as')
      expect(keywords).not.toContain('a')
      expect(keywords).not.toContain('i')
      expect(keywords).not.toContain('to')
    })
  })
})
