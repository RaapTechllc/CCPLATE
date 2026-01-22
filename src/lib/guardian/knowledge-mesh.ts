import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const MEMORY_DIR = join(process.cwd(), 'memory');
const MESH_FILE = join(MEMORY_DIR, 'session-knowledge.jsonl');

export type KnowledgeType = 
  | 'discovery'      // Found something important about the codebase
  | 'warning'        // Potential issue others should avoid
  | 'pattern'        // Coding pattern to follow
  | 'dependency'     // Dependency relationship discovered
  | 'blocker'        // Something blocking progress
  | 'resolution';    // How an issue was resolved

export interface KnowledgeEntry {
  id: string;
  timestamp: string;
  worktreeId: string;
  agentName: string;
  type: KnowledgeType;
  title: string;
  content: string;
  relatedFiles?: string[];
  tags?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

function ensureMemoryDir(): void {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

export function broadcast(entry: Omit<KnowledgeEntry, 'id' | 'timestamp'>): KnowledgeEntry {
  ensureMemoryDir();
  
  const fullEntry: KnowledgeEntry = {
    ...entry,
    id: `k-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  
  appendFileSync(MESH_FILE, JSON.stringify(fullEntry) + '\n');
  return fullEntry;
}

export function getKnowledge(options?: {
  since?: Date;
  excludeWorktree?: string;
  types?: KnowledgeType[];
  minPriority?: KnowledgeEntry['priority'];
}): KnowledgeEntry[] {
  if (!existsSync(MESH_FILE)) return [];
  
  const lines = readFileSync(MESH_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  let entries: KnowledgeEntry[] = lines.map(line => JSON.parse(line));
  
  if (options?.since) {
    entries = entries.filter(e => new Date(e.timestamp) > options.since!);
  }
  
  if (options?.excludeWorktree) {
    entries = entries.filter(e => e.worktreeId !== options.excludeWorktree);
  }
  
  if (options?.types?.length) {
    entries = entries.filter(e => options.types!.includes(e.type));
  }
  
  if (options?.minPriority) {
    const priorities = ['low', 'medium', 'high', 'critical'];
    const minIndex = priorities.indexOf(options.minPriority);
    entries = entries.filter(e => priorities.indexOf(e.priority) >= minIndex);
  }
  
  return entries;
}

export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return '';
  
  const grouped = entries.reduce((acc, e) => {
    acc[e.type] = acc[e.type] || [];
    acc[e.type].push(e);
    return acc;
  }, {} as Record<string, KnowledgeEntry[]>);
  
  let output = '## 🧠 Knowledge Mesh (Cross-Worktree Intelligence)\n\n';
  
  for (const [type, items] of Object.entries(grouped)) {
    output += `### ${type.toUpperCase()}\n`;
    for (const item of items) {
      output += `- **${item.title}** (from ${item.worktreeId}): ${item.content}\n`;
    }
    output += '\n';
  }
  
  return output;
}

export function getKnowledgeForFiles(files: string[]): KnowledgeEntry[] {
  const all = getKnowledge();
  return all.filter(e => 
    e.relatedFiles?.some(f => files.some(target => target.includes(f) || f.includes(target)))
  );
}

export function getNewKnowledgeSince(timestamp: Date, excludeWorktree?: string): KnowledgeEntry[] {
  return getKnowledge({
    since: timestamp,
    excludeWorktree,
    minPriority: 'medium',
  });
}

export function getHighPriorityKnowledge(excludeWorktree?: string): KnowledgeEntry[] {
  return getKnowledge({
    excludeWorktree,
    minPriority: 'high',
  });
}
