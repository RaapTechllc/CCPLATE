/**
 * TDD Tests for File Relevance Matching
 *
 * Tests for isFileRelevant() function in prd.ts
 * This function determines if a file path is relevant to the PRD scope.
 */

import { describe, it, expect } from 'vitest'
import { isFileRelevant } from '../../src/lib/guardian/prd'

describe('isFileRelevant', () => {
  describe('matches keywords in file paths', () => {
    it('returns true when file path contains keyword "auth"', () => {
      const result = isFileRelevant('src/lib/auth.ts', ['auth', 'dashboard'])

      expect(result).toBe(true)
    })

    it('returns true when file path contains keyword "dashboard"', () => {
      const result = isFileRelevant(
        'src/components/Dashboard.tsx',
        ['auth', 'dashboard']
      )

      expect(result).toBe(true)
    })

    it('returns true when directory contains keyword', () => {
      const result = isFileRelevant(
        'src/features/authentication/login.ts',
        ['authentication', 'user']
      )

      expect(result).toBe(true)
    })

    it('returns false when file does not match any keyword', () => {
      const result = isFileRelevant('src/unrelated/foo.ts', ['auth', 'dashboard'])

      expect(result).toBe(false)
    })

    it('handles case-insensitive matching', () => {
      const result = isFileRelevant('src/lib/AUTH/LoginForm.tsx', ['auth'])

      expect(result).toBe(true)
    })

    it('matches partial path segments', () => {
      const result = isFileRelevant(
        'src/components/UserAuthForm.tsx',
        ['auth', 'user']
      )

      expect(result).toBe(true)
    })
  })

  describe('whitelist patterns - test files', () => {
    it('returns true for .test.ts files regardless of keywords', () => {
      const result = isFileRelevant('src/unrelated/foo.test.ts', [])

      expect(result).toBe(true)
    })

    it('returns true for .spec.ts files regardless of keywords', () => {
      const result = isFileRelevant('src/random/bar.spec.ts', [])

      expect(result).toBe(true)
    })

    it('returns true for files in __tests__ directory', () => {
      const result = isFileRelevant(
        'src/features/__tests__/anything.ts',
        []
      )

      expect(result).toBe(true)
    })

    it('returns true for files in tests/ directory', () => {
      const result = isFileRelevant('tests/guardian/prd.test.ts', [])

      expect(result).toBe(true)
    })

    it('returns true for e2e test files', () => {
      const result = isFileRelevant('e2e/auth.spec.ts', [])

      expect(result).toBe(true)
    })
  })

  describe('whitelist patterns - memory files', () => {
    it('returns true for memory/** files', () => {
      const result = isFileRelevant('memory/workflow-state.json', [])

      expect(result).toBe(true)
    })

    it('returns true for nested memory files', () => {
      const result = isFileRelevant('memory/harness/report.json', [])

      expect(result).toBe(true)
    })
  })

  describe('whitelist patterns - .claude files', () => {
    it('returns true for .claude/** files', () => {
      const result = isFileRelevant('.claude/agents/new-agent.md', [])

      expect(result).toBe(true)
    })

    it('returns true for .claude/hooks files', () => {
      const result = isFileRelevant('.claude/hooks/custom-hook.ts', [])

      expect(result).toBe(true)
    })

    it('returns true for .claude/rules files', () => {
      const result = isFileRelevant('.claude/rules/new-rule.md', [])

      expect(result).toBe(true)
    })
  })

  describe('whitelist patterns - config files', () => {
    it('returns true for package.json', () => {
      const result = isFileRelevant('package.json', [])

      expect(result).toBe(true)
    })

    it('returns true for tsconfig.json', () => {
      const result = isFileRelevant('tsconfig.json', [])

      expect(result).toBe(true)
    })

    it('returns true for config files with .config extension', () => {
      const result = isFileRelevant('vitest.config.ts', [])

      expect(result).toBe(true)
    })

    it('returns true for .env files', () => {
      const result = isFileRelevant('.env.local', [])

      expect(result).toBe(true)
    })

    it('returns true for CLAUDE.md', () => {
      const result = isFileRelevant('CLAUDE.md', [])

      expect(result).toBe(true)
    })

    it('returns true for ccplate.config.json', () => {
      const result = isFileRelevant('ccplate.config.json', [])

      expect(result).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('returns false for empty keywords array with non-whitelisted file', () => {
      const result = isFileRelevant('src/random/file.ts', [])

      expect(result).toBe(false)
    })

    it('handles empty file path', () => {
      const result = isFileRelevant('', ['auth'])

      expect(result).toBe(false)
    })

    it('handles file path with only extension', () => {
      const result = isFileRelevant('.ts', ['auth'])

      expect(result).toBe(false)
    })

    it('handles Windows-style paths', () => {
      const result = isFileRelevant(
        'src\\lib\\auth\\login.ts',
        ['auth']
      )

      expect(result).toBe(true)
    })

    it('handles paths with special characters', () => {
      const result = isFileRelevant(
        'src/lib/auth-flow_v2.ts',
        ['auth']
      )

      expect(result).toBe(true)
    })
  })

  describe('multiple keyword matching', () => {
    it('returns true if any keyword matches', () => {
      const result = isFileRelevant(
        'src/features/auth/login.ts',
        ['unrelated', 'also-unrelated', 'auth']
      )

      expect(result).toBe(true)
    })

    it('returns false if no keywords match', () => {
      const result = isFileRelevant(
        'src/features/billing/payment.ts',
        ['auth', 'dashboard', 'user']
      )

      expect(result).toBe(false)
    })
  })

  describe('tech stack keyword matching', () => {
    it('matches react component files', () => {
      const result = isFileRelevant(
        'src/components/Button.tsx',
        ['react', 'component']
      )

      expect(result).toBe(true)
    })

    it('matches next.js app router files', () => {
      const result = isFileRelevant(
        'src/app/dashboard/page.tsx',
        ['next', 'app', 'dashboard']
      )

      expect(result).toBe(true)
    })

    it('matches prisma schema files', () => {
      const result = isFileRelevant('prisma/schema.prisma', ['prisma', 'schema'])

      expect(result).toBe(true)
    })
  })
})
