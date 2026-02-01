#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * CCPLATE Profile Wizard
 *
 * Interactive CLI for selecting MCP server profiles.
 * Helps beginners optimize context usage for their project type.
 *
 * Run with: node scripts/profile-wizard.js
 */

const { execSync } = require('child_process');
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
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}i${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
};

// Profile definitions (must match stack-profiles.ts)
const PROFILES = [
  {
    id: 'beginner-light',
    name: 'Beginner Light',
    description: 'Disables ALL heavy MCPs for maximum context savings.',
    contextSavings: '~60-80%',
    experienceLevel: 'beginner',
    projectTypes: ['learning', 'simple-script', 'first-project'],
  },
  {
    id: 'web-dev',
    name: 'Web Development',
    description: 'Optimized for frontend/fullstack web development.',
    contextSavings: '~20-30%',
    experienceLevel: 'intermediate',
    projectTypes: ['web-app', 'frontend', 'fullstack'],
  },
  {
    id: 'backend',
    name: 'Backend Development',
    description: 'Optimized for API and backend development.',
    contextSavings: '~20-30%',
    experienceLevel: 'intermediate',
    projectTypes: ['api', 'backend', 'microservices'],
  },
  {
    id: 'data-science',
    name: 'Data Science',
    description: 'Optimized for data analysis and ML work.',
    contextSavings: '~20-30%',
    experienceLevel: 'intermediate',
    projectTypes: ['data-analysis', 'machine-learning', 'jupyter'],
  },
];

// ============================================================================
// Readline utilities
// ============================================================================

function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function showOptions(options, selectedIndex = 0) {
  console.log('');
  options.forEach((opt, i) => {
    const marker = i === selectedIndex ? `${colors.cyan}>${colors.reset}` : ' ';
    const highlight = i === selectedIndex ? colors.bold : colors.dim;
    console.log(`  ${marker} ${highlight}${i + 1}. ${opt.label}${colors.reset}`);
    if (opt.description) {
      console.log(`     ${colors.dim}${opt.description}${colors.reset}`);
    }
  });
  console.log('');
}

async function selectOption(rl, prompt, options) {
  console.log(`\n${colors.bold}${prompt}${colors.reset}`);
  showOptions(options);

  const answer = await question(rl, `${colors.cyan}Enter number (1-${options.length}):${colors.reset} `);
  const index = parseInt(answer, 10) - 1;

  if (isNaN(index) || index < 0 || index >= options.length) {
    log.warn('Invalid selection. Please try again.');
    return selectOption(rl, prompt, options);
  }

  return options[index];
}

// ============================================================================
// Wizard Steps
// ============================================================================

async function askProjectType(rl) {
  const options = [
    { value: 'web-app', label: 'Web Application', description: 'React, Next.js, Vue, or similar' },
    { value: 'api', label: 'API / Backend', description: 'REST API, GraphQL, or microservices' },
    { value: 'script', label: 'Script / Automation', description: 'CLI tools, automation scripts' },
    { value: 'data', label: 'Data Science / ML', description: 'Jupyter notebooks, data analysis' },
    { value: 'learning', label: 'Learning / Experimenting', description: 'Just learning Claude Code' },
  ];

  const selected = await selectOption(rl, 'What are you building?', options);
  return selected.value;
}

async function askExperienceLevel(rl) {
  const options = [
    {
      value: 'beginner',
      label: 'Beginner - Max Context (Recommended)',
      description: 'Disables most MCP servers for maximum available context',
    },
    {
      value: 'intermediate',
      label: 'Intermediate - Balanced',
      description: 'Enables relevant MCP servers for your project type',
    },
    {
      value: 'advanced',
      label: 'Advanced - Custom',
      description: 'Skip wizard, configure manually',
    },
  ];

  const selected = await selectOption(rl, 'What is your experience level with Claude Code?', options);
  return selected.value;
}

function recommendProfile(projectType, experienceLevel) {
  // Beginners always get beginner-light
  if (experienceLevel === 'beginner') {
    return 'beginner-light';
  }

  // Map project type to recommended profile
  const projectProfileMap = {
    'web-app': 'web-dev',
    'api': 'backend',
    'script': 'beginner-light',
    'data': 'data-science',
    'learning': 'beginner-light',
  };

  return projectProfileMap[projectType] || 'beginner-light';
}

async function confirmProfile(rl, profileId) {
  const profile = PROFILES.find(p => p.id === profileId);
  if (!profile) return false;

  console.log(`\n${colors.cyan}${'─'.repeat(50)}${colors.reset}`);
  console.log(`${colors.bold}Recommended Profile: ${profile.name}${colors.reset}`);
  console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}`);
  console.log(`\n${profile.description}`);
  console.log(`\n${colors.green}Context Savings: ${profile.contextSavings}${colors.reset}\n`);

  const answer = await question(rl, `${colors.cyan}Apply this profile? (y/n):${colors.reset} `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

// ============================================================================
// Profile Activation
// ============================================================================

function activateProfile(profileId) {
  const rootDir = process.cwd();
  const ccplatePath = path.join(rootDir, 'src', 'cli', 'ccplate.ts');

  // Check if we can use bun
  let hasBun = false;
  try {
    execSync('bun --version', { stdio: 'ignore' });
    hasBun = true;
  } catch {
    // Bun not available
  }

  if (hasBun && fs.existsSync(ccplatePath)) {
    try {
      execSync(`bun run ${ccplatePath} profile activate ${profileId}`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
      return true;
    } catch {
      log.warn('Failed to activate via ccplate CLI');
    }
  }

  // Fallback: Direct file manipulation
  return activateProfileDirect(rootDir, profileId);
}

function activateProfileDirect(rootDir, profileId) {
  const mcpPath = path.join(rootDir, '.mcp.json');
  const backupPath = path.join(rootDir, 'memory', 'mcp-backup.json');
  const activeProfilePath = path.join(rootDir, 'memory', 'active-profile.json');

  // Ensure memory directory exists
  const memoryDir = path.join(rootDir, 'memory');
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }

  // Load current config
  let currentConfig = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    try {
      currentConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    } catch (e) {
      log.error(`Failed to parse .mcp.json: ${e.message}`);
      return false;
    }
  }

  // Backup if not already done
  if (!fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(mcpPath, backupPath);
      log.success('Backed up .mcp.json to memory/mcp-backup.json');
    } catch (e) {
      log.warn('Could not backup .mcp.json');
    }
  }

  // Load backup as source of available servers
  let sourceConfig = currentConfig;
  if (fs.existsSync(backupPath)) {
    try {
      sourceConfig = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    } catch {
      // Use current config
    }
  }

  // Get profile
  const profile = PROFILES.find(p => p.id === profileId);
  if (!profile) {
    log.error(`Profile '${profileId}' not found`);
    return false;
  }

  // Servers to disable based on profile
  const disabledServers = {
    'beginner-light': ['postgres', 'github', 'vercel', 'docker', 'redis', 'jupyter', 'python'],
    'web-dev': ['jupyter', 'python', 'docker', 'redis'],
    'backend': ['jupyter', 'python', 'vercel'],
    'data-science': ['vercel', 'docker', 'redis'],
  };

  const toDisable = disabledServers[profileId] || [];

  // Create new config
  const newConfig = { mcpServers: {} };
  for (const [serverId, serverConfig] of Object.entries(sourceConfig.mcpServers || {})) {
    if (!toDisable.includes(serverId)) {
      newConfig.mcpServers[serverId] = serverConfig;
    }
  }

  // Save new config
  try {
    fs.writeFileSync(mcpPath, JSON.stringify(newConfig, null, 2) + '\n');
  } catch (e) {
    log.error(`Failed to write .mcp.json: ${e.message}`);
    return false;
  }

  // Save active profile state
  const activeProfile = {
    profileId,
    activatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(activeProfilePath, JSON.stringify(activeProfile, null, 2) + '\n');

  return true;
}

// ============================================================================
// Main Wizard
// ============================================================================

async function runWizard() {
  console.log(`
${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗
║              CCPLATE Stack Profile Wizard                   ║
║          Optimize Context for Your Project                  ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
`);

  log.info('This wizard helps you configure MCP servers for optimal context usage.');
  log.info('Disabling unused servers gives you more context for actual coding.');

  const rl = createRL();

  try {
    // Step 1: Project type
    const projectType = await askProjectType(rl);

    // Step 2: Experience level
    const experienceLevel = await askExperienceLevel(rl);

    // Handle advanced users
    if (experienceLevel === 'advanced') {
      log.info('Skipping wizard. Use `ccplate profile` commands to configure manually.');
      console.log(`
${colors.cyan}Available commands:${colors.reset}
  ccplate profile list              # Show all profiles
  ccplate profile activate <name>   # Activate a profile
  ccplate profile reset             # Restore original config
`);
      rl.close();
      return;
    }

    // Step 3: Recommend and confirm profile
    const recommendedProfile = recommendProfile(projectType, experienceLevel);
    const confirmed = await confirmProfile(rl, recommendedProfile);

    rl.close();

    if (!confirmed) {
      log.info('Profile activation cancelled.');
      log.info('Run `ccplate profile list` to see all available profiles.');
      return;
    }

    // Step 4: Activate profile
    log.info(`Activating profile: ${recommendedProfile}...`);

    if (activateProfile(recommendedProfile)) {
      const profile = PROFILES.find(p => p.id === recommendedProfile);
      console.log(`
${colors.green}${'═'.repeat(50)}
  ✓ Profile '${profile.name}' activated!

  Context savings: ${profile.contextSavings}
${'═'.repeat(50)}${colors.reset}

${colors.cyan}Next steps:${colors.reset}
  1. Start a new Claude Code session to use the new settings
  2. Use \`ccplate profile reset\` to restore original settings
  3. Run \`ccplate status\` to monitor context usage
`);
    } else {
      log.error('Failed to activate profile.');
      log.info('Try running `ccplate profile activate ' + recommendedProfile + '` directly.');
    }
  } catch (error) {
    rl.close();
    log.error(`Wizard error: ${error.message}`);
    process.exit(1);
  }
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
CCPLATE Profile Wizard

Interactive wizard to select MCP server profiles for optimal context usage.

Usage: node scripts/profile-wizard.js [options]

Options:
  --help, -h     Show this help message
  --list         List all available profiles
  --activate ID  Activate a profile by ID (non-interactive)
  --reset        Restore original MCP configuration
`);
  process.exit(0);
}

if (args.includes('--list')) {
  console.log(`\n${colors.bold}Available Profiles:${colors.reset}\n`);
  PROFILES.forEach(profile => {
    const levelEmoji = profile.experienceLevel === 'beginner' ? '🟢' :
                       profile.experienceLevel === 'intermediate' ? '🟡' : '🔴';
    console.log(`${levelEmoji} ${colors.bold}${profile.name}${colors.reset}`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   ${profile.description}`);
    console.log(`   Context Savings: ${colors.green}${profile.contextSavings}${colors.reset}\n`);
  });
  process.exit(0);
}

if (args.includes('--activate')) {
  const idx = args.indexOf('--activate');
  const profileId = args[idx + 1];
  if (!profileId) {
    log.error('Missing profile ID. Usage: --activate <profile-id>');
    process.exit(1);
  }
  if (activateProfile(profileId)) {
    log.success(`Profile '${profileId}' activated.`);
  } else {
    log.error(`Failed to activate profile '${profileId}'.`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.includes('--reset')) {
  const rootDir = process.cwd();
  const mcpPath = path.join(rootDir, '.mcp.json');
  const backupPath = path.join(rootDir, 'memory', 'mcp-backup.json');

  if (!fs.existsSync(backupPath)) {
    log.error('No backup found. Cannot reset.');
    process.exit(1);
  }

  try {
    fs.copyFileSync(backupPath, mcpPath);
    log.success('MCP configuration restored from backup.');
  } catch (e) {
    log.error(`Failed to restore: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

// Run interactive wizard
runWizard().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
