/**
 * Vercel Deploy Module
 *
 * Handles deployment to Vercel with claimable deployments,
 * status checking, and credential validation.
 *
 * SECURITY NOTE: All external commands use spawnSync with argument
 * arrays to prevent command injection.
 */

import { spawnSync } from 'child_process';
import { existsSync, appendFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateSafeIdentifier } from './security/input-validation';

// ============================================================================
// Types
// ============================================================================

export interface DeployOptions {
  /** Project root directory */
  rootDir: string;
  /** Environment to deploy to */
  env?: 'production' | 'preview';
  /** Custom project name override */
  projectName?: string;
  /** Force deployment even with warnings */
  force?: boolean;
  /** Whether to produce claimable URLs */
  claimable?: boolean;
}

export interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  deploymentUrl?: string;
  previewUrl?: string;
  claimUrl?: string;
  inspectorUrl?: string;
  error?: string;
  logs?: string;
}

export interface DeploymentStatus {
  id: string;
  state: 'BUILDING' | 'READY' | 'ERROR' | 'QUEUED' | 'CANCELED';
  url?: string;
  createdAt: string;
  readyAt?: string;
  errorMessage?: string;
}

export interface DeploymentRecord {
  id: string;
  deploymentId: string;
  environment: 'production' | 'preview';
  url: string;
  previewUrl?: string;
  claimUrl?: string;
  createdAt: string;
  createdBy: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface CredentialValidation {
  valid: boolean;
  missing: string[];
  warnings: string[];
  vercelCliInstalled: boolean;
  vercelCliVersion?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEPLOYMENTS_LOG_FILE = 'memory/deployments.jsonl';

// ============================================================================
// Credential Validation
// ============================================================================

/**
 * Validates Vercel credentials and CLI availability
 */
export function validateVercelCredentials(rootDir: string): CredentialValidation {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  if (!process.env.VERCEL_API_TOKEN) {
    missing.push('VERCEL_API_TOKEN');
  }

  // Check optional but recommended variables
  if (!process.env.VERCEL_TEAM_ID) {
    warnings.push('VERCEL_TEAM_ID not set - deployments will use personal account');
  }

  // Check if Vercel CLI is installed
  const vercelVersion = spawnSync('vercel', ['--version'], {
    encoding: 'utf-8',
    shell: process.platform === 'win32', // Required on Windows
    timeout: 10000,
  });

  const vercelCliInstalled = vercelVersion.status === 0;
  const vercelCliVersion = vercelCliInstalled
    ? vercelVersion.stdout?.trim()
    : undefined;

  if (!vercelCliInstalled) {
    missing.push('Vercel CLI (install with: npm i -g vercel)');
  }

  // Check for vercel.json
  const vercelConfigPath = join(rootDir, 'vercel.json');
  if (!existsSync(vercelConfigPath)) {
    warnings.push('vercel.json not found - using defaults');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
    vercelCliInstalled,
    vercelCliVersion,
  };
}

/**
 * Formats credential validation result for display
 */
export function formatCredentialValidation(result: CredentialValidation): string {
  const lines: string[] = [];

  lines.push('Vercel Credential Validation');
  lines.push('─'.repeat(40));

  if (result.vercelCliInstalled) {
    lines.push(`✅ Vercel CLI: ${result.vercelCliVersion}`);
  } else {
    lines.push('❌ Vercel CLI: Not installed');
  }

  if (process.env.VERCEL_API_TOKEN) {
    lines.push('✅ VERCEL_API_TOKEN: Set');
  } else {
    lines.push('❌ VERCEL_API_TOKEN: Missing');
  }

  if (process.env.VERCEL_TEAM_ID) {
    lines.push(`✅ VERCEL_TEAM_ID: ${process.env.VERCEL_TEAM_ID}`);
  } else {
    lines.push('⚠️  VERCEL_TEAM_ID: Not set (using personal account)');
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    result.warnings.forEach(w => lines.push(`  ⚠️  ${w}`));
  }

  if (result.missing.length > 0) {
    lines.push('');
    lines.push('Missing:');
    result.missing.forEach(m => lines.push(`  ❌ ${m}`));
  }

  lines.push('');
  lines.push(result.valid ? '✅ Ready to deploy' : '❌ Cannot deploy - fix issues above');

  return lines.join('\n');
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy to Vercel using the CLI
 *
 * Uses spawnSync with argument arrays for security.
 */
export function deployToVercel(options: DeployOptions): DeploymentResult {
  const { rootDir, env = 'preview', projectName, force = false } = options;

  // Validate credentials first
  const credentials = validateVercelCredentials(rootDir);
  if (!credentials.valid) {
    return {
      success: false,
      error: `Credential validation failed: ${credentials.missing.join(', ')}`,
    };
  }

  // Build command arguments (using array for security)
  const args: string[] = ['deploy'];

  // Environment
  if (env === 'production') {
    args.push('--prod');
  }

  // Project name override
  if (projectName) {
    // Validate project name to prevent injection
    try {
      validateSafeIdentifier(projectName, 'projectName');
      args.push('--name', projectName);
    } catch (e) {
      return {
        success: false,
        error: `Invalid project name: ${(e as Error).message}`,
      };
    }
  }

  // Force deployment
  if (force) {
    args.push('--force');
  }

  // Token (from environment)
  if (process.env.VERCEL_API_TOKEN) {
    args.push('--token', process.env.VERCEL_API_TOKEN);
  }

  // Team scope
  if (process.env.VERCEL_TEAM_ID) {
    args.push('--scope', process.env.VERCEL_TEAM_ID);
  }

  // Always confirm (non-interactive)
  args.push('--yes');

  // Execute deployment
  const result = spawnSync('vercel', args, {
    cwd: rootDir,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
    timeout: 300000, // 5 minute timeout
    env: {
      ...process.env,
      VERCEL_API_TOKEN: process.env.VERCEL_API_TOKEN,
    },
  });

  // Parse output
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const output = stdout + '\n' + stderr;

  if (result.status !== 0) {
    // Log the failed deployment
    logDeployment(rootDir, {
      id: `deploy-${Date.now()}`,
      deploymentId: '',
      environment: env,
      url: '',
      createdAt: new Date().toISOString(),
      createdBy: process.env.USER || 'unknown',
      status: 'failed',
      error: stderr || 'Deployment failed',
    });

    return {
      success: false,
      error: stderr || 'Deployment failed',
      logs: output,
    };
  }

  // Extract URLs from output
  const urlMatch = stdout.match(/https:\/\/[^\s]+\.vercel\.app/);
  const deploymentUrl = urlMatch ? urlMatch[0] : undefined;

  // Extract deployment ID (from URL or inspect link)
  const inspectorMatch = stdout.match(/https:\/\/vercel\.com\/[^\s]+\/[^\s]+\/([a-zA-Z0-9]+)/);
  const deploymentId = inspectorMatch ? inspectorMatch[1] : `deploy-${Date.now()}`;

  // Log successful deployment
  const record: DeploymentRecord = {
    id: `deploy-${Date.now()}`,
    deploymentId,
    environment: env,
    url: deploymentUrl || '',
    createdAt: new Date().toISOString(),
    createdBy: process.env.USER || 'unknown',
    status: 'success',
  };

  logDeployment(rootDir, record);

  return {
    success: true,
    deploymentId,
    deploymentUrl,
    previewUrl: deploymentUrl,
    logs: output,
  };
}

/**
 * Get deployment status from Vercel
 */
export function getDeploymentStatus(
  deploymentId: string,
  rootDir: string
): DeploymentStatus | null {
  // Validate deployment ID
  try {
    validateSafeIdentifier(deploymentId, 'deploymentId');
  } catch {
    return null;
  }

  const args = ['inspect', deploymentId];

  if (process.env.VERCEL_API_TOKEN) {
    args.push('--token', process.env.VERCEL_API_TOKEN);
  }

  if (process.env.VERCEL_TEAM_ID) {
    args.push('--scope', process.env.VERCEL_TEAM_ID);
  }

  const result = spawnSync('vercel', args, {
    cwd: rootDir,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
    timeout: 30000,
  });

  if (result.status !== 0) {
    return null;
  }

  const output = result.stdout;

  // Parse status from output
  const stateMatch = output.match(/State:\s+(\w+)/i);
  const urlMatch = output.match(/URL:\s+(https:\/\/[^\s]+)/i);
  const createdMatch = output.match(/Created:\s+([^\n]+)/i);

  return {
    id: deploymentId,
    state: (stateMatch?.[1]?.toUpperCase() || 'UNKNOWN') as DeploymentStatus['state'],
    url: urlMatch?.[1],
    createdAt: createdMatch?.[1] || new Date().toISOString(),
  };
}

/**
 * List recent deployments from log
 */
export function listDeployments(
  rootDir: string,
  options: { limit?: number } = {}
): DeploymentRecord[] {
  const { limit = 10 } = options;
  const logPath = join(rootDir, DEPLOYMENTS_LOG_FILE);

  if (!existsSync(logPath)) {
    return [];
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  const records: DeploymentRecord[] = [];

  for (const line of lines.slice(-limit * 2)) {
    try {
      const record = JSON.parse(line) as DeploymentRecord;
      records.push(record);
    } catch {
      // Skip malformed lines
    }
  }

  // Return most recent first, limited
  return records.slice(-limit).reverse();
}

/**
 * Format deployment list for display
 */
export function formatDeploymentList(records: DeploymentRecord[]): string {
  if (records.length === 0) {
    return 'No deployments found';
  }

  const lines: string[] = [];
  lines.push('Recent Deployments');
  lines.push('─'.repeat(60));

  for (const record of records) {
    const time = new Date(record.createdAt).toLocaleString();
    const statusIcon = record.status === 'success' ? '✅' : '❌';
    const envLabel = record.environment === 'production' ? '🚀 PROD' : '🔍 PREVIEW';

    lines.push(`${statusIcon} ${record.deploymentId || record.id}`);
    lines.push(`   ${envLabel} | ${time} | by ${record.createdBy}`);

    if (record.url) {
      lines.push(`   URL: ${record.url}`);
    }

    if (record.error) {
      lines.push(`   Error: ${record.error}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Log deployment to JSONL file
 */
function logDeployment(rootDir: string, record: DeploymentRecord): void {
  const logPath = join(rootDir, DEPLOYMENTS_LOG_FILE);

  // Ensure directory exists
  const logDir = join(rootDir, 'memory');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  appendFileSync(logPath, JSON.stringify(record) + '\n');
}

// ============================================================================
// CLI Integration Helpers
// ============================================================================

/**
 * Parse environment from CLI args
 */
export function parseDeployEnv(args: string[]): 'production' | 'preview' {
  if (args.includes('--prod') || args.includes('--production')) {
    return 'production';
  }
  return 'preview';
}

/**
 * Get the --name flag value from args
 */
export function parseProjectName(args: string[]): string | undefined {
  const nameIndex = args.indexOf('--name');
  if (nameIndex !== -1 && args[nameIndex + 1]) {
    return args[nameIndex + 1];
  }
  return undefined;
}
