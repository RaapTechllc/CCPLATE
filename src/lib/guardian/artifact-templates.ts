import { createArtifact } from './artifacts';

export function createInvestigationArtifact(jobId: string, findings: {
  summary: string;
  rootCause: string;
  affectedFiles: string[];
  suggestedFix: string;
}): ReturnType<typeof createArtifact> {
  return createArtifact({
    type: 'investigation',
    jobId,
    createdBy: 'investigator-agent',
    title: 'Issue Investigation',
    content: `
## Summary
${findings.summary}

## Root Cause
${findings.rootCause}

## Affected Files
${findings.affectedFiles.map(f => `- ${f}`).join('\n')}

## Suggested Fix
${findings.suggestedFix}
`,
    metadata: { affectedFiles: findings.affectedFiles },
  });
}

export function createPlanArtifact(jobId: string, plan: {
  steps: Array<{ title: string; description: string; files: string[] }>;
}, parentArtifactId?: string): ReturnType<typeof createArtifact> {
  return createArtifact({
    type: 'plan',
    jobId,
    createdBy: 'planner-agent',
    title: 'Implementation Plan',
    content: plan.steps.map((step, i) => `
### Step ${i + 1}: ${step.title}
${step.description}

**Files:** ${step.files.join(', ')}
`).join('\n'),
    metadata: { stepCount: plan.steps.length },
    parentArtifactId,
  });
}
