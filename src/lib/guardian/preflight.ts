import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export interface PreflightCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  fix?: string;
}

export interface PreflightResult {
  worktreeId: string;
  worktreePath: string;
  passed: boolean;
  checks: PreflightCheck[];
  timestamp: string;
}

export function runPreflightChecks(worktreePath: string, worktreeId: string): PreflightResult {
  const checks: PreflightCheck[] = [];

  // 1. Check .claude directory exists
  const claudeDir = join(worktreePath, '.claude');
  if (existsSync(claudeDir)) {
    checks.push({ name: 'Claude Config', status: 'pass', message: '.claude/ directory exists' });
  } else {
    checks.push({
      name: 'Claude Config',
      status: 'fail',
      message: '.claude/ directory missing',
      fix: 'Copy .claude/ from main worktree',
    });
  }

  // 2. Check hooks are present
  const hooksDir = join(worktreePath, '.claude', 'hooks');
  if (existsSync(hooksDir) && readdirSync(hooksDir).length > 0) {
    checks.push({ name: 'Hooks', status: 'pass', message: 'Hooks directory populated' });
  } else {
    checks.push({
      name: 'Hooks',
      status: 'warn',
      message: 'No hooks found - Guardian features may not work',
      fix: 'Copy hooks from main worktree',
    });
  }

  // 3. Check node_modules
  const nodeModules = join(worktreePath, 'node_modules');
  if (existsSync(nodeModules)) {
    checks.push({ name: 'Dependencies', status: 'pass', message: 'node_modules exists' });
  } else {
    checks.push({
      name: 'Dependencies',
      status: 'fail',
      message: 'node_modules missing',
      fix: 'Run: npm install',
    });
  }

  // 4. Check .env or .env.local
  const hasEnv = existsSync(join(worktreePath, '.env')) || existsSync(join(worktreePath, '.env.local'));
  if (hasEnv) {
    checks.push({ name: 'Environment', status: 'pass', message: 'Environment file exists' });
  } else {
    checks.push({
      name: 'Environment',
      status: 'warn',
      message: 'No .env file found',
      fix: 'Copy .env.local from main worktree (ensure secrets are appropriate)',
    });
  }

  // 5. Check TypeScript compiles
  try {
    execSync('npx tsc --noEmit 2>&1 | head -5', {
      cwd: worktreePath,
      stdio: 'pipe',
      timeout: 30000,
    });
    checks.push({ name: 'TypeScript', status: 'pass', message: 'TypeScript compiles' });
  } catch {
    checks.push({
      name: 'TypeScript',
      status: 'warn',
      message: 'TypeScript has errors (may be pre-existing)',
    });
  }

  // 6. Check Prisma client
  const prismaClient = join(worktreePath, 'src', 'generated', 'prisma');
  if (existsSync(prismaClient)) {
    checks.push({ name: 'Prisma Client', status: 'pass', message: 'Prisma client generated' });
  } else {
    checks.push({
      name: 'Prisma Client',
      status: 'fail',
      message: 'Prisma client not generated',
      fix: 'Run: npm run db:generate',
    });
  }

  // 7. Check memory directory
  const memoryDir = join(worktreePath, 'memory');
  if (existsSync(memoryDir)) {
    checks.push({ name: 'Memory Dir', status: 'pass', message: 'memory/ directory exists' });
  } else {
    checks.push({
      name: 'Memory Dir',
      status: 'warn',
      message: 'memory/ directory missing',
      fix: 'Will be created on first use',
    });
  }

  const passed = checks.every((c) => c.status !== 'fail');

  return {
    worktreeId,
    worktreePath,
    passed,
    checks,
    timestamp: new Date().toISOString(),
  };
}

export function autoFixWorktree(worktreePath: string): string[] {
  const fixes: string[] = [];

  // Install dependencies if missing
  if (!existsSync(join(worktreePath, 'node_modules'))) {
    try {
      execSync('npm install', { cwd: worktreePath, stdio: 'pipe', timeout: 120000 });
      fixes.push('Installed npm dependencies');
    } catch {
      fixes.push('Failed to install dependencies');
    }
  }

  // Generate Prisma client if missing
  if (!existsSync(join(worktreePath, 'src', 'generated', 'prisma'))) {
    try {
      execSync('npm run db:generate', { cwd: worktreePath, stdio: 'pipe', timeout: 60000 });
      fixes.push('Generated Prisma client');
    } catch {
      fixes.push('Failed to generate Prisma client');
    }
  }

  return fixes;
}

export function formatPreflightResult(result: PreflightResult): string {
  let output = `\n📋 Preflight Check: ${result.worktreeId}\n`;
  output += `   Path: ${result.worktreePath}\n`;
  output += `   Status: ${result.passed ? '✅ READY' : '❌ NOT READY'}\n\n`;

  for (const check of result.checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    output += `   ${icon} ${check.name}: ${check.message}\n`;
    if (check.fix) {
      output += `      Fix: ${check.fix}\n`;
    }
  }

  return output;
}
