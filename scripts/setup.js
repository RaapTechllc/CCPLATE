#!/usr/bin/env node

/**
 * CCPLATE Setup Script
 *
 * Checks and installs required dependencies for the CCPLATE boilerplate.
 * Run with: node scripts/setup.js
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

// Check if a command exists
function commandExists(cmd) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${cmd}`, { stdio: 'ignore' });
    } else {
      execSync(`which ${cmd}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

// Get command version
function getVersion(cmd, versionFlag = '--version') {
  try {
    const result = execSync(`${cmd} ${versionFlag}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return result.trim().split('\n')[0];
  } catch {
    return null;
  }
}

// Run a command and return success/failure
function runCommand(cmd, options = {}) {
  try {
    execSync(cmd, { stdio: options.silent ? 'ignore' : 'inherit', ...options });
    return true;
  } catch {
    return false;
  }
}

// Prompt user for yes/no
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Check Node.js PATH configuration (Windows-specific issue)
function checkNodeInPath() {
  if (process.platform !== 'win32') return true;

  // On Windows, check if node is accessible from cmd.exe
  try {
    execSync('node --version', {
      stdio: 'ignore',
      shell: 'cmd.exe'
    });
    return true;
  } catch {
    return false;
  }
}

// Main setup function
async function setup() {
  console.log(`
${colors.bold}${colors.cyan}╔═══════════════════════════════════════════════════════╗
║              CCPLATE Setup & Dependency Check          ║
╚═══════════════════════════════════════════════════════╝${colors.reset}
`);

  const issues = [];
  const warnings = [];

  // ─────────────────────────────────────────────────────────────
  log.header('1. Checking Required Dependencies');
  // ─────────────────────────────────────────────────────────────

  // Node.js
  const nodeVersion = getVersion('node');
  if (nodeVersion) {
    log.success(`Node.js: ${nodeVersion}`);

    // Check minimum version (18+)
    const versionMatch = nodeVersion.match(/v?(\d+)\./);
    if (versionMatch && parseInt(versionMatch[1]) < 18) {
      warnings.push('Node.js version 18+ recommended for best compatibility');
    }
  } else {
    log.error('Node.js: NOT FOUND');
    issues.push('Node.js is required. Install from https://nodejs.org/');
  }

  // npm
  const npmVersion = getVersion('npm');
  if (npmVersion) {
    log.success(`npm: ${npmVersion}`);
  } else {
    log.error('npm: NOT FOUND');
    issues.push('npm is required. It should come with Node.js installation.');
  }

  // Git
  const gitVersion = getVersion('git');
  if (gitVersion) {
    log.success(`Git: ${gitVersion}`);
  } else {
    log.error('Git: NOT FOUND');
    issues.push('Git is required. Install from https://git-scm.com/');
  }

  // ─────────────────────────────────────────────────────────────
  log.header('2. Checking PATH Configuration');
  // ─────────────────────────────────────────────────────────────

  if (process.platform === 'win32') {
    const nodeInPath = checkNodeInPath();
    if (nodeInPath) {
      log.success('Node.js is accessible from system PATH');
    } else {
      log.error('Node.js is NOT in system PATH');
      issues.push(`
Node.js is not in your Windows PATH. npm scripts will fail.

To fix this:
1. Open System Properties > Environment Variables
2. Under "System variables", find and edit "Path"
3. Add: C:\\Program Files\\nodejs
4. Restart your terminal/IDE

Alternatively, run this in PowerShell (as Administrator):
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\\Program Files\\nodejs", "Machine")
`);
    }
  } else {
    log.success('PATH configuration looks good');
  }

  // ─────────────────────────────────────────────────────────────
  log.header('3. Checking Optional Dependencies');
  // ─────────────────────────────────────────────────────────────

  // Bun (optional, for Guardian tests)
  const bunVersion = getVersion('bun');
  if (bunVersion) {
    log.success(`Bun: ${bunVersion}`);
  } else {
    log.warn('Bun: NOT FOUND (optional - needed for Guardian CLI and some tests)');
    warnings.push('Bun is not installed. Some Guardian CLI commands and tests require it.');
  }

  // PostgreSQL (optional but recommended)
  const psqlVersion = getVersion('psql');
  if (psqlVersion) {
    log.success(`PostgreSQL: ${psqlVersion}`);
  } else {
    log.warn('PostgreSQL CLI: NOT FOUND (needed for database features)');
    warnings.push('PostgreSQL is not installed. Database features will not work.');
  }

  // ─────────────────────────────────────────────────────────────
  log.header('4. Installing npm Dependencies');
  // ─────────────────────────────────────────────────────────────

  const nodeModulesExists = fs.existsSync(path.join(process.cwd(), 'node_modules'));
  const packageLockExists = fs.existsSync(path.join(process.cwd(), 'package-lock.json'));

  if (!nodeModulesExists) {
    log.info('node_modules not found, running npm install...');
    if (runCommand('npm install')) {
      log.success('npm dependencies installed');
    } else {
      log.error('npm install failed');
      issues.push('npm install failed. Check the error output above.');
    }
  } else {
    log.success('node_modules exists');

    // Check if we should update
    if (packageLockExists) {
      log.info('Running npm ci to ensure dependencies match lock file...');
      if (!runCommand('npm ci', { silent: true })) {
        log.warn('npm ci failed, trying npm install...');
        runCommand('npm install');
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  log.header('5. Setting Up Playwright (E2E Tests)');
  // ─────────────────────────────────────────────────────────────

  // Check if Playwright browsers are installed
  const playwrightInstalled = fs.existsSync(
    path.join(process.cwd(), 'node_modules', '@playwright', 'test')
  );

  if (playwrightInstalled) {
    log.info('Installing Playwright browsers...');
    if (runCommand('npx playwright install chromium', { silent: true })) {
      log.success('Playwright browsers installed');
    } else {
      log.warn('Playwright browser installation failed (tests may not run)');
      warnings.push('Playwright browsers could not be installed. E2E tests may fail.');
    }
  } else {
    log.warn('Playwright not found in node_modules');
  }

  // ─────────────────────────────────────────────────────────────
  log.header('6. Checking Environment Configuration');
  // ─────────────────────────────────────────────────────────────

  const envLocalExists = fs.existsSync(path.join(process.cwd(), '.env.local'));
  const envExampleExists = fs.existsSync(path.join(process.cwd(), '.env.example'));

  if (envLocalExists) {
    log.success('.env.local exists');
  } else if (envExampleExists) {
    log.warn('.env.local not found, copying from .env.example...');
    try {
      fs.copyFileSync(
        path.join(process.cwd(), '.env.example'),
        path.join(process.cwd(), '.env.local')
      );
      log.success('.env.local created from .env.example');
      warnings.push('Created .env.local from .env.example. Please update with your actual values.');
    } catch (e) {
      log.error('Could not create .env.local');
    }
  } else {
    log.warn('.env.local not found and no .env.example to copy');
    warnings.push('No .env.local file. Create one with your environment variables.');
  }

  // ─────────────────────────────────────────────────────────────
  log.header('7. Initializing Guardian Memory Directory');
  // ─────────────────────────────────────────────────────────────

  const memoryDir = path.join(process.cwd(), 'memory');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
    log.success('Created memory/ directory');
  } else {
    log.success('memory/ directory exists');
  }

  // Create initial state files if they don't exist
  const stateFiles = [
    { name: 'guardian-state.json', content: '{"lastTick":0,"cooldowns":{},"tickCount":0}' },
    { name: 'workflow-state.json', content: '{"phase":"idle","currentTask":null}' },
  ];

  for (const file of stateFiles) {
    const filePath = path.join(memoryDir, file.name);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
      log.success(`Created ${file.name}`);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────

  console.log(`
${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}
${colors.bold}                        SUMMARY${colors.reset}
${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}
`);

  if (issues.length === 0 && warnings.length === 0) {
    log.success('All checks passed! CCPLATE is ready to use.');
    console.log(`
${colors.green}Next steps:${colors.reset}
  1. npm run dev     - Start development server
  2. npm run build   - Build for production
  3. npm test        - Run tests
`);
    return 0;
  }

  if (issues.length > 0) {
    console.log(`${colors.red}${colors.bold}Critical Issues (${issues.length}):${colors.reset}\n`);
    issues.forEach((issue, i) => {
      console.log(`${colors.red}${i + 1}. ${issue}${colors.reset}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}Warnings (${warnings.length}):${colors.reset}\n`);
    warnings.forEach((warning, i) => {
      console.log(`${colors.yellow}${i + 1}. ${warning}${colors.reset}\n`);
    });
  }

  if (issues.length > 0) {
    console.log(`${colors.red}Please fix the critical issues above before proceeding.${colors.reset}\n`);
    return 1;
  }

  console.log(`${colors.green}Setup complete with warnings. You can proceed, but some features may not work.${colors.reset}\n`);
  return 0;
}

// ─────────────────────────────────────────────────────────────
// Optional: Install bun
// ─────────────────────────────────────────────────────────────

async function installBun() {
  log.header('Installing Bun');

  if (process.platform === 'win32') {
    log.info('Installing Bun via PowerShell...');
    const result = spawnSync('powershell', [
      '-Command',
      'irm bun.sh/install.ps1 | iex'
    ], { stdio: 'inherit' });
    return result.status === 0;
  } else {
    log.info('Installing Bun via curl...');
    return runCommand('curl -fsSL https://bun.sh/install | bash');
  }
}

// ─────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CCPLATE Setup Script

Usage: node scripts/setup.js [options]

Options:
  --help, -h       Show this help message
  --install-bun    Install Bun runtime
  --check-only     Only check dependencies, don't install anything
`);
  process.exit(0);
}

if (args.includes('--install-bun')) {
  installBun().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  setup().then(code => {
    process.exit(code);
  });
}
