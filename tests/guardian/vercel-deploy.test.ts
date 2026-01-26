/**
 * Unit Tests for Vercel Deploy Module
 *
 * Tests credential validation, deployment formatting, error handling,
 * and input security for the vercel-deploy.ts module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  validateVercelCredentials,
  formatCredentialValidation,
  listDeployments,
  formatDeploymentList,
  parseDeployEnv,
  parseProjectName,
  type DeploymentRecord,
  type CredentialValidation,
} from '../../src/lib/guardian/vercel-deploy'

// Mock child_process
vi.mock('child_process', () => ({
  spawnSync: vi.fn(() => ({
    status: 0,
    stdout: 'Vercel CLI 33.0.0',
    stderr: '',
  })),
}))

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => ''),
  appendFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

describe('validateVercelCredentials', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('when all credentials are present', () => {
    it('returns valid: true with Vercel CLI installed', async () => {
      process.env.VERCEL_API_TOKEN = 'test-token'
      process.env.VERCEL_TEAM_ID = 'team_test'

      // Re-import to get fresh module with new env
      const { validateVercelCredentials } = await import('../../src/lib/guardian/vercel-deploy')
      const result = validateVercelCredentials('/test/root')

      expect(result.valid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it('includes vercel CLI version when available', async () => {
      process.env.VERCEL_API_TOKEN = 'test-token'

      const { validateVercelCredentials } = await import('../../src/lib/guardian/vercel-deploy')
      const result = validateVercelCredentials('/test/root')

      expect(result.vercelCliInstalled).toBe(true)
      expect(result.vercelCliVersion).toBe('Vercel CLI 33.0.0')
    })
  })

  describe('when credentials are missing', () => {
    it('returns valid: false when VERCEL_API_TOKEN is missing', async () => {
      delete process.env.VERCEL_API_TOKEN

      const { validateVercelCredentials } = await import('../../src/lib/guardian/vercel-deploy')
      const result = validateVercelCredentials('/test/root')

      expect(result.valid).toBe(false)
      expect(result.missing).toContain('VERCEL_API_TOKEN')
    })

    it('adds warning when VERCEL_TEAM_ID is not set', async () => {
      process.env.VERCEL_API_TOKEN = 'test-token'
      delete process.env.VERCEL_TEAM_ID

      const { validateVercelCredentials } = await import('../../src/lib/guardian/vercel-deploy')
      const result = validateVercelCredentials('/test/root')

      expect(result.warnings.some(w => w.includes('VERCEL_TEAM_ID'))).toBe(true)
    })
  })
})

describe('formatCredentialValidation', () => {
  it('formats successful validation', () => {
    const result: CredentialValidation = {
      valid: true,
      missing: [],
      warnings: [],
      vercelCliInstalled: true,
      vercelCliVersion: '33.0.0',
    }

    const formatted = formatCredentialValidation(result)

    expect(formatted).toContain('Vercel CLI: 33.0.0')
    expect(formatted).toContain('Ready to deploy')
  })

  it('formats validation with missing items', () => {
    const result: CredentialValidation = {
      valid: false,
      missing: ['VERCEL_API_TOKEN'],
      warnings: [],
      vercelCliInstalled: false,
    }

    const formatted = formatCredentialValidation(result)

    expect(formatted).toContain('VERCEL_API_TOKEN')
    expect(formatted).toContain('Cannot deploy')
  })

  it('formats validation with warnings', () => {
    const result: CredentialValidation = {
      valid: true,
      missing: [],
      warnings: ['VERCEL_TEAM_ID not set'],
      vercelCliInstalled: true,
    }

    const formatted = formatCredentialValidation(result)

    expect(formatted).toContain('VERCEL_TEAM_ID')
    expect(formatted).toContain('Warnings')
  })
})

describe('parseDeployEnv', () => {
  it('returns "preview" by default', () => {
    expect(parseDeployEnv([])).toBe('preview')
    expect(parseDeployEnv(['deploy'])).toBe('preview')
  })

  it('returns "production" when --prod is passed', () => {
    expect(parseDeployEnv(['--prod'])).toBe('production')
    expect(parseDeployEnv(['deploy', '--prod'])).toBe('production')
  })

  it('returns "production" when --production is passed', () => {
    expect(parseDeployEnv(['--production'])).toBe('production')
  })
})

describe('parseProjectName', () => {
  it('returns undefined when --name is not passed', () => {
    expect(parseProjectName([])).toBeUndefined()
    expect(parseProjectName(['deploy'])).toBeUndefined()
  })

  it('returns project name when --name is passed', () => {
    expect(parseProjectName(['--name', 'my-project'])).toBe('my-project')
    expect(parseProjectName(['deploy', '--name', 'test-app'])).toBe('test-app')
  })

  it('returns undefined when --name has no value', () => {
    expect(parseProjectName(['--name'])).toBeUndefined()
  })
})

describe('formatDeploymentList', () => {
  it('returns message when no deployments', () => {
    const formatted = formatDeploymentList([])

    expect(formatted).toContain('No deployments found')
  })

  it('formats deployment records correctly', () => {
    const records: DeploymentRecord[] = [
      {
        id: 'deploy-1',
        deploymentId: 'dpl_abc123',
        environment: 'production',
        url: 'https://test.vercel.app',
        createdAt: '2024-01-23T12:00:00.000Z',
        createdBy: 'developer',
        status: 'success',
      },
    ]

    const formatted = formatDeploymentList(records)

    expect(formatted).toContain('dpl_abc123')
    expect(formatted).toContain('PROD')
    expect(formatted).toContain('https://test.vercel.app')
  })

  it('shows error for failed deployments', () => {
    const records: DeploymentRecord[] = [
      {
        id: 'deploy-1',
        deploymentId: 'dpl_abc123',
        environment: 'preview',
        url: '',
        createdAt: '2024-01-23T12:00:00.000Z',
        createdBy: 'developer',
        status: 'failed',
        error: 'Build failed',
      },
    ]

    const formatted = formatDeploymentList(records)

    expect(formatted).toContain('Build failed')
  })

  it('shows PREVIEW for non-production deployments', () => {
    const records: DeploymentRecord[] = [
      {
        id: 'deploy-1',
        deploymentId: 'dpl_abc123',
        environment: 'preview',
        url: 'https://test-abc.vercel.app',
        createdAt: '2024-01-23T12:00:00.000Z',
        createdBy: 'developer',
        status: 'success',
      },
    ]

    const formatted = formatDeploymentList(records)

    expect(formatted).toContain('PREVIEW')
  })
})

describe('listDeployments', () => {
  it('returns empty array when log file does not exist', async () => {
    const { existsSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(false)

    const { listDeployments } = await import('../../src/lib/guardian/vercel-deploy')
    const result = listDeployments('/test/root')

    expect(result).toEqual([])
  })

  it('respects limit option', async () => {
    const { existsSync, readFileSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)

    const records = Array.from({ length: 20 }, (_, i) => ({
      id: `deploy-${i}`,
      deploymentId: `dpl_${i}`,
      environment: 'preview',
      url: `https://test-${i}.vercel.app`,
      createdAt: new Date().toISOString(),
      createdBy: 'test',
      status: 'success',
    }))

    vi.mocked(readFileSync).mockReturnValue(
      records.map(r => JSON.stringify(r)).join('\n')
    )

    const { listDeployments } = await import('../../src/lib/guardian/vercel-deploy')
    const result = listDeployments('/test/root', { limit: 5 })

    expect(result).toHaveLength(5)
  })

  it('handles malformed JSON lines gracefully', async () => {
    const { existsSync, readFileSync } = await import('fs')
    vi.mocked(existsSync).mockReturnValue(true)

    const content = `
{"id":"deploy-1","deploymentId":"dpl_1","environment":"preview","url":"","createdAt":"2024-01-01T00:00:00Z","createdBy":"test","status":"success"}
not-valid-json
{"id":"deploy-2","deploymentId":"dpl_2","environment":"preview","url":"","createdAt":"2024-01-01T00:00:00Z","createdBy":"test","status":"success"}
`

    vi.mocked(readFileSync).mockReturnValue(content)

    const { listDeployments } = await import('../../src/lib/guardian/vercel-deploy')
    const result = listDeployments('/test/root')

    // Should skip the malformed line
    expect(result.length).toBe(2)
  })
})

describe('Security: Input Validation', () => {
  describe('project name validation', () => {
    it('rejects project names with shell metacharacters', async () => {
      // This test validates that deployToVercel rejects malicious project names
      // The actual validation is done by validateSafeIdentifier
      const { validateSafeIdentifier } = await import('../../src/lib/guardian/security/input-validation')

      expect(() => validateSafeIdentifier('test;rm -rf /', 'projectName')).toThrow()
      expect(() => validateSafeIdentifier('test|cat /etc/passwd', 'projectName')).toThrow()
      expect(() => validateSafeIdentifier('test`whoami`', 'projectName')).toThrow()
      expect(() => validateSafeIdentifier('test$(id)', 'projectName')).toThrow()
    })

    it('accepts valid project names', async () => {
      const { validateSafeIdentifier } = await import('../../src/lib/guardian/security/input-validation')

      expect(validateSafeIdentifier('my-project', 'projectName')).toBe('my-project')
      expect(validateSafeIdentifier('test.app', 'projectName')).toBe('test.app')
      expect(validateSafeIdentifier('app_v2', 'projectName')).toBe('app_v2')
    })
  })

  describe('deployment ID validation', () => {
    it('rejects deployment IDs with shell metacharacters', async () => {
      const { validateSafeIdentifier } = await import('../../src/lib/guardian/security/input-validation')

      expect(() => validateSafeIdentifier('dpl_test;whoami', 'deploymentId')).toThrow()
      expect(() => validateSafeIdentifier('dpl_test&&id', 'deploymentId')).toThrow()
    })
  })
})
