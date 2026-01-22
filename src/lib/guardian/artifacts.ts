import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export type ArtifactType = 
  | 'investigation'   // Analysis of an issue/bug
  | 'plan'            // Implementation plan
  | 'code_change'     // Diff or file changes
  | 'test_results'    // Test output
  | 'review'          // Code review feedback
  | 'summary';        // Final summary

export interface Artifact {
  id: string;
  type: ArtifactType;
  jobId: string;
  worktreeId?: string;
  createdBy: string;  // Agent name
  createdAt: string;
  title: string;
  content: string;    // Markdown content
  metadata: Record<string, unknown>;
  parentArtifactId?: string;  // For chaining
}

const MEMORY_DIR = join(process.cwd(), 'memory');
const ARTIFACTS_DIR = join(MEMORY_DIR, 'artifacts');

function ensureArtifactsDir(): void {
  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
}

export function createArtifact(artifact: Omit<Artifact, 'id' | 'createdAt'>): Artifact {
  ensureArtifactsDir();
  
  const newArtifact: Artifact = {
    ...artifact,
    id: `artifact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  
  const filePath = join(ARTIFACTS_DIR, `${newArtifact.id}.json`);
  writeFileSync(filePath, JSON.stringify(newArtifact, null, 2));
  
  return newArtifact;
}

export function getArtifact(id: string): Artifact | null {
  const filePath = join(ARTIFACTS_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function getArtifactsByJob(jobId: string): Artifact[] {
  ensureArtifactsDir();
  const files = readdirSync(ARTIFACTS_DIR).filter(f => f.endsWith('.json'));
  
  return files
    .map(f => JSON.parse(readFileSync(join(ARTIFACTS_DIR, f), 'utf-8')) as Artifact)
    .filter(a => a.jobId === jobId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getArtifactChain(artifactId: string): Artifact[] {
  const chain: Artifact[] = [];
  let current = getArtifact(artifactId);
  
  while (current) {
    chain.unshift(current);
    current = current.parentArtifactId ? getArtifact(current.parentArtifactId) : null;
  }
  
  return chain;
}

export function formatArtifactsForPrompt(artifacts: Artifact[]): string {
  if (artifacts.length === 0) return '';
  
  return artifacts.map(a => `
## Artifact: ${a.title}
**Type:** ${a.type} | **Created by:** ${a.createdBy} | **Time:** ${a.createdAt}

${a.content}
`).join('\n---\n');
}
