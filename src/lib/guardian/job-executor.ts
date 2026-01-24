import { execSync } from 'child_process';
import { GuardianJob, updateJob, getPendingJobs } from './job-queue';
import { analyzeIssue } from './labeling';
import { createLogger } from './logger';

const log = createLogger('guardian.job');

/**
 * Command configuration for GitHub-triggered jobs
 */
const COMMAND_CONFIG: Record<string, {
  agentType: string;
  createWorktree: boolean;
  autoLabel: boolean;
}> = {
  investigate: {
    agentType: 'rlm-adapter',
    createWorktree: false,
    autoLabel: true,
  },
  fix: {
    agentType: 'implementer',
    createWorktree: true,
    autoLabel: true,
  },
  triage: {
    agentType: 'triage',
    createWorktree: false,
    autoLabel: true,
  },
  review: {
    agentType: 'reviewer',
    createWorktree: false,
    autoLabel: false,
  },
  plan: {
    agentType: 'Plan',
    createWorktree: false,
    autoLabel: true,
  },
};

export async function executeJob(job: GuardianJob): Promise<void> {
  log.info('Executing job', { jobId: job.id, command: job.command, args: job.args });
  console.log(`Executing job ${job.id}: ${job.command} ${job.args}`);

  updateJob(job.id, { status: 'running', startedAt: new Date().toISOString() });

  try {
    const config = COMMAND_CONFIG[job.command];
    if (!config) {
      throw new Error(`Unknown command: ${job.command}`);
    }

    let worktreeId: string | undefined;

    // Create worktree if needed
    if (config.createWorktree) {
      worktreeId = `job-${job.source.issueNumber || job.source.prNumber || Date.now()}`;

      log.info('Creating worktree for job', { jobId: job.id, worktreeId });

      execSync(`bun run src/cli/ccplate.ts worktree create ${worktreeId} --note "Job ${job.id}"`, {
        cwd: process.cwd(),
        stdio: 'pipe',
      });

      updateJob(job.id, { worktreeId });
    }

    // Execute command-specific logic
    switch (job.command) {
      case 'triage': {
        // Auto-analyze and suggest labels
        if (job.source.issueNumber) {
          const analysis = analyzeIssue(
            job.source.issueNumber,
            job.args || '',
            ''
          );
          log.info('Triage analysis complete', {
            issueNumber: job.source.issueNumber,
            labels: analysis.suggestedLabels,
          });
          updateJob(job.id, {
            artifacts: [`labels:${analysis.suggestedLabels.join(',')}`],
          });
        }
        break;
      }

      case 'investigate':
      case 'fix':
      case 'review':
      case 'plan': {
        // These would invoke the team-coordinator or appropriate agent
        log.info('Invoking agent for job', {
          jobId: job.id,
          agentType: config.agentType,
          worktreeId,
        });
        console.log(`Would invoke ${config.agentType} agent for: ${job.command}`);
        break;
      }

      default:
        throw new Error(`Unknown command: ${job.command}`);
    }

    log.info('Job completed', { jobId: job.id });

    updateJob(job.id, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error('Job failed', { jobId: job.id, error: errorMsg });

    updateJob(job.id, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: errorMsg,
    });
  }
}

export async function processQueue(): Promise<void> {
  const pending = getPendingJobs();
  log.info('Processing queue', { pendingCount: pending.length });
  console.log(`Processing ${pending.length} pending jobs`);

  for (const job of pending) {
    await executeJob(job);
  }

  log.info('Queue processing complete', { processedCount: pending.length });
}
