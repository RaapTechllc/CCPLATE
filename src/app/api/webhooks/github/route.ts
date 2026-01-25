import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { createJob } from "@/lib/guardian/job-queue";
import { analyzeIssue } from "@/lib/guardian/labeling";
import { createLogger } from "@/lib/guardian/logger";
import {
  validatePositiveInteger,
  validateOptionalPositiveInteger,
  ValidationError,
} from "@/lib/guardian/security";

const log = createLogger("guardian.webhook");

/**
 * Guardian command definitions
 */
const GUARDIAN_COMMANDS: Record<
  string,
  {
    description: string;
    agentType: string;
    autoLabel?: boolean;
    createWorktree?: boolean;
    createPR?: boolean;
    requiresPR?: boolean;
  }
> = {
  investigate: {
    description: "Investigate the issue and create a plan",
    agentType: "rlm-adapter",
    autoLabel: true,
  },
  fix: {
    description: "Create a fix for this issue",
    agentType: "implementer",
    createWorktree: true,
    createPR: true,
  },
  triage: {
    description: "Analyze and label this issue",
    agentType: "triage",
    autoLabel: true,
  },
  review: {
    description: "Review the linked PR",
    agentType: "reviewer",
    requiresPR: true,
  },
  plan: {
    description: "Create an implementation plan",
    agentType: "Plan",
    autoLabel: true,
  },
};

/**
 * Verify GitHub webhook signature.
 *
 * SECURITY: Signature verification is mandatory in all environments.
 * Set GITHUB_WEBHOOK_SECRET environment variable.
 *
 * The only exception is for test environments with explicit opt-in:
 * Set ALLOW_UNSIGNED_WEBHOOKS=true in test environment only.
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): { valid: boolean; error?: string } {
  // SECURITY: Require webhook secret in all environments
  if (!secret) {
    // Only allow bypass in test environment with explicit opt-in
    if (
      process.env.NODE_ENV === "test" &&
      process.env.ALLOW_UNSIGNED_WEBHOOKS === "true"
    ) {
      log.warn(
        "Webhook signature verification disabled for testing. " +
          "ALLOW_UNSIGNED_WEBHOOKS=true is set."
      );
      return { valid: true };
    }

    // All other environments: require the secret
    return {
      valid: false,
      error:
        "GITHUB_WEBHOOK_SECRET is required. " +
        "Set the environment variable with your GitHub webhook secret.",
    };
  }

  // Require signature header when secret is configured
  if (!signature) {
    return { valid: false, error: "Missing x-hub-signature-256 header" };
  }

  try {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(payload).digest("hex");

    if (signature.length !== digest.length) {
      return { valid: false, error: "Signature length mismatch" };
    }

    const valid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
    return valid ? { valid: true } : { valid: false, error: "Signature mismatch" };
  } catch (err) {
    log.error("Signature verification failed", {
      error: (err as Error).message,
    });
    return { valid: false, error: "Signature verification error" };
  }
}

/**
 * Parse @guardian command from comment body
 */
function parseGuardianCommand(
  body: string
): { command: string; args: string } | null {
  if (!body || typeof body !== "string") {
    return null;
  }
  const match = body.match(/@guardian\s+(\w+)(?:\s+(.*))?/i);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: match[2]?.trim() || "" };
}

/**
 * Add reaction to a comment via GitHub API
 */
async function addReaction(
  repo: string,
  commentId: number,
  reaction: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;

  try {
    await fetch(
      `https://api.github.com/repos/${repo}/issues/comments/${commentId}/reactions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ content: reaction }),
      }
    );
  } catch (err) {
    log.warn("Failed to add reaction", {
      repo,
      commentId,
      error: (err as Error).message,
    });
  }
}

/**
 * Add comment to an issue via GitHub API
 */
async function addComment(
  repo: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;

  try {
    await fetch(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ body }),
      }
    );
  } catch (err) {
    log.warn("Failed to add comment", {
      repo,
      issueNumber,
      error: (err as Error).message,
    });
  }
}

/**
 * Apply labels to an issue via GitHub API
 */
async function applyLabels(
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || labels.length === 0) return;

  try {
    await fetch(
      `https://api.github.com/repos/${repo}/issues/${issueNumber}/labels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ labels }),
      }
    );
    log.info("Applied labels", { repo, issueNumber, labels });
  } catch (err) {
    log.warn("Failed to apply labels", {
      repo,
      issueNumber,
      error: (err as Error).message,
    });
  }
}

export async function POST(request: NextRequest) {
  let payload: string;

  try {
    const signature = request.headers.get("x-hub-signature-256") || "";
    const event = request.headers.get("x-github-event");
    payload = await request.text();

    // Validate payload exists
    if (!payload) {
      log.warn("Empty payload received");
      return NextResponse.json({ error: "Empty payload" }, { status: 400 });
    }

    // Verify webhook signature (mandatory in production)
    const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
    const signatureResult = verifySignature(payload, signature, secret);
    if (!signatureResult.valid) {
      log.warn("Webhook signature verification failed", {
        event,
        error: signatureResult.error,
      });
      return NextResponse.json(
        { error: signatureResult.error || "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse JSON payload
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(payload);
    } catch {
      log.warn("Invalid JSON payload");
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Validate expected structure
    if (!data || typeof data !== "object") {
      log.warn("Payload is not an object");
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }

    const repo = (data.repository as Record<string, unknown>)
      ?.full_name as string;

    // Handle issue and PR comments
    if (event === "issue_comment" || event === "pull_request_review_comment") {
      const comment = data.comment as Record<string, unknown>;
      const issue = data.issue as Record<string, unknown>;
      const commentBody = comment?.body as string;
      const rawCommentId = comment?.id;
      const rawIssueNumber = issue?.number;
      const issueTitle = issue?.title as string;
      const issueBody = issue?.body as string;
      const author = (comment?.user as Record<string, unknown>)
        ?.login as string;

      // SECURITY: Validate numeric fields from external webhook payload
      let issueNumber: number;
      let commentId: number;
      try {
        issueNumber = validatePositiveInteger(rawIssueNumber, "issueNumber");
        commentId = validatePositiveInteger(rawCommentId, "commentId");
      } catch (error) {
        if (error instanceof ValidationError) {
          log.warn("Invalid webhook payload", {
            event,
            error: error.message,
            field: error.field,
          });
          return NextResponse.json(
            { error: `Invalid ${error.field}: ${error.message}` },
            { status: 400 }
          );
        }
        throw error;
      }

      const parsed = parseGuardianCommand(commentBody);

      if (parsed) {
        const { command, args } = parsed;
        const commandDef = GUARDIAN_COMMANDS[command];

        if (!commandDef) {
          log.warn("Unknown guardian command", { command, repo, issueNumber });
          return NextResponse.json(
            { status: "error", message: `Unknown command: ${command}` },
            { status: 400 }
          );
        }

        log.info("Guardian command received", {
          command,
          args,
          repo,
          issueNumber,
          author,
        });

        // Add eyes reaction to acknowledge
        await addReaction(repo, commentId, "eyes");

        // Auto-label if requested
        if (commandDef.autoLabel) {
          const analysis = analyzeIssue(
            issueNumber,
            issueTitle || "",
            issueBody || ""
          );
          await applyLabels(repo, issueNumber, analysis.suggestedLabels);
        }

        // Create job in queue
        const job = createJob({
          command,
          args,
          source: {
            type: event === "pull_request_review_comment" ? "github_pr" : "github_issue",
            repo,
            issueNumber,
            prNumber: event === "pull_request_review_comment" ? issueNumber : undefined,
            commentId,
            author,
          },
        });

        log.info("Job created", { jobId: job.id, command, issueNumber });

        // Add comment acknowledging the command
        await addComment(
          repo,
          issueNumber,
          `🤖 Guardian acknowledged: \`@guardian ${command}${args ? " " + args : ""}\`\n\n` +
            `Job ID: \`${job.id}\`\n` +
            `Status: Queued`
        );

        return NextResponse.json({
          status: "queued",
          jobId: job.id,
          command,
          issueNumber,
          repo,
        });
      }
    }

    // Handle new issues (auto-triage)
    if (event === "issues" && (data.action === "opened" || data.action === "edited")) {
      const issue = data.issue as Record<string, unknown>;
      const rawIssueNumber = issue?.number;
      const issueTitle = issue?.title as string;
      const issueBody = issue?.body as string;

      // SECURITY: Validate issueNumber from external webhook payload
      let issueNumber: number;
      try {
        issueNumber = validatePositiveInteger(rawIssueNumber, "issueNumber");
      } catch (error) {
        if (error instanceof ValidationError) {
          log.warn("Invalid webhook payload for issues event", {
            event,
            error: error.message,
          });
          return NextResponse.json(
            { error: `Invalid issueNumber: ${error.message}` },
            { status: 400 }
          );
        }
        throw error;
      }

      // Auto-analyze and suggest labels (but don't apply automatically on open)
      const analysis = analyzeIssue(issueNumber, issueTitle || "", issueBody || "");

      log.info("Auto-analyzed issue", {
        issueNumber,
        suggestedLabels: analysis.suggestedLabels,
        parallelSafe: analysis.parallelSafe,
      });

      return NextResponse.json({
        status: "analyzed",
        issueNumber,
        analysis: {
          suggestedLabels: analysis.suggestedLabels,
          mentionedFiles: analysis.mentionedFiles,
          parallelSafe: analysis.parallelSafe,
        },
      });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (err) {
    log.error("Webhook processing failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    commands: Object.keys(GUARDIAN_COMMANDS),
  });
}
