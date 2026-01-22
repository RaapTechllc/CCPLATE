import { execSync } from 'child_process';
import { GuardianJob, updateJob, getPendingJobs } from './job-queue';

export async function executeJob(job: GuardianJob): Promise<void> {
  console.log(`Executing job ${job.id}: ${job.command} ${job.args}`);
  
  updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() });
  
  try {
    const worktreeId = `job-${job.source.issueNumber || job.source.prNumber || Date.now()}`;
    
    execSync(`bun run src/cli/ccplate.ts worktree create ${worktreeId}`, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
    
    updateJob(job.id, { worktreeId });
    
    switch (job.command) {
      case 'fix':
      case 'investigate':
      case 'review':
        console.log(`Would invoke team-coordinator for: ${job.command}`);
        break;
      default:
        throw new Error(`Unknown command: ${job.command}`);
    }
    
    updateJob(job.id, { 
      status: 'completed', 
      completedAt: new Date().toISOString() 
    });
    
  } catch (error) {
    updateJob(job.id, { 
      status: 'failed', 
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function processQueue(): Promise<void> {
  const pending = getPendingJobs();
  console.log(`Processing ${pending.length} pending jobs`);
  
  for (const job of pending) {
    await executeJob(job);
  }
}
