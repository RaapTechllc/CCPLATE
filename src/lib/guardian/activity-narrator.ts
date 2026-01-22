import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MEMORY_DIR = join(process.cwd(), 'memory');
const ACTIVITY_FILE = join(MEMORY_DIR, 'ACTIVITY.md');

export interface ActivityEntry {
  timestamp: string;
  loop: number;
  worktree?: string;
  agent?: string;
  action: string;
  details?: string;
  status: 'started' | 'progress' | 'success' | 'failed' | 'blocked';
  tasksRemaining?: number;
  tasksTotal?: number;
}

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

function getCurrentLoop(): number {
  if (!existsSync(ACTIVITY_FILE)) return 1;
  
  const content = readFileSync(ACTIVITY_FILE, 'utf-8');
  const matches = content.match(/Loop (\d+)/g);
  if (!matches) return 1;
  
  const loops = matches.map(m => parseInt(m.replace('Loop ', '')));
  return Math.max(...loops);
}

export function narrate(entry: Omit<ActivityEntry, 'timestamp' | 'loop'>): void {
  ensureMemoryDir();
  
  const now = new Date();
  const loop = getCurrentLoop();
  const time = formatTime(now);
  
  const statusEmoji = {
    started: '🚀',
    progress: '⏳',
    success: '✅',
    failed: '❌',
    blocked: '🚧',
  }[entry.status];
  
  let line = `| ${time} | Loop ${loop} | ${statusEmoji} | `;
  
  if (entry.worktree) {
    line += `\`${entry.worktree}\` | `;
  }
  
  line += `**${entry.action}**`;
  
  if (entry.details) {
    line += ` - ${entry.details}`;
  }
  
  if (entry.tasksRemaining !== undefined && entry.tasksTotal !== undefined) {
    line += ` (${entry.tasksTotal - entry.tasksRemaining}/${entry.tasksTotal} tasks)`;
  }
  
  line += ' |\n';
  
  if (!existsSync(ACTIVITY_FILE)) {
    const header = `# Activity Log

> Human-readable log of Guardian activity. Scan this to catch up quickly.

| Time | Loop | Status | Activity |
|------|------|--------|----------|
`;
    appendFileSync(ACTIVITY_FILE, header);
  }
  
  appendFileSync(ACTIVITY_FILE, line);
}

export function incrementLoop(): number {
  const currentLoop = getCurrentLoop();
  return currentLoop + 1;
}

export function narrateSummary(summary: {
  duration: string;
  tasksCompleted: number;
  testsRun: number;
  testsPassed: number;
  commits: number;
  worktrees: number;
}): void {
  ensureMemoryDir();
  
  const summaryBlock = `
---

### Session Summary (${new Date().toLocaleDateString()})

- ⏱️ Duration: ${summary.duration}
- ✅ Tasks completed: ${summary.tasksCompleted}
- 🧪 Tests: ${summary.testsPassed}/${summary.testsRun} passed
- 📝 Commits: ${summary.commits}
- 🌳 Worktrees used: ${summary.worktrees}

---

`;
  
  appendFileSync(ACTIVITY_FILE, summaryBlock);
}

export function getRecentActivity(lines: number = 10): string {
  if (!existsSync(ACTIVITY_FILE)) return 'No activity yet.';
  
  const content = readFileSync(ACTIVITY_FILE, 'utf-8');
  const allLines = content.split('\n');
  
  const tableRows = allLines.filter(l => l.startsWith('|') && !l.includes('---'));
  return tableRows.slice(-lines).join('\n');
}

export function getFullActivity(): string {
  if (!existsSync(ACTIVITY_FILE)) return 'No activity yet.';
  return readFileSync(ACTIVITY_FILE, 'utf-8');
}
