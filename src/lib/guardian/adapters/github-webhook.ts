import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import * as crypto from 'crypto';
import { logWebhookError, logMalformedInput } from '../error-log';

const app = new Hono();
const ROOT_DIR = process.cwd();

function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    // Handle length mismatch
    if (signature.length !== digest.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (err) {
    logWebhookError(ROOT_DIR, 'verifySignature', err, { signatureLength: signature?.length });
    return false;
  }
}

function parseGuardianCommand(body: string): { command: string; args: string } | null {
  if (!body || typeof body !== 'string') {
    return null;
  }
  const match = body.match(/@guardian\s+(\w+)(?:\s+(.*))?/i);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: match[2] || '' };
}

app.post('/webhook/github', async (c) => {
  let payload: string;
  let data: Record<string, unknown>;
  
  try {
    const signature = c.req.header('x-hub-signature-256') || '';
    const event = c.req.header('x-github-event');
    payload = await c.req.text();
    
    // Validate payload exists
    if (!payload) {
      logMalformedInput(ROOT_DIR, 'webhook', 'github_webhook', 'Empty payload received');
      return c.json({ error: 'Empty payload' }, 400);
    }
    
    // Verify signature if secret is configured
    const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
    if (secret && !verifySignature(payload, signature, secret)) {
      logWebhookError(ROOT_DIR, 'github_webhook', new Error('Invalid signature'), {
        event,
        signaturePresent: !!signature,
      });
      return c.json({ error: 'Invalid signature' }, 401);
    }
    
    // Parse JSON payload
    try {
      data = JSON.parse(payload);
    } catch (parseErr) {
      logMalformedInput(ROOT_DIR, 'webhook', 'github_webhook', 'Invalid JSON payload', payload.slice(0, 500));
      return c.json({ error: 'Invalid JSON' }, 400);
    }
    
    // Validate expected structure
    if (!data || typeof data !== 'object') {
      logMalformedInput(ROOT_DIR, 'webhook', 'github_webhook', 'Payload is not an object');
      return c.json({ error: 'Invalid payload structure' }, 400);
    }
    
    if (event === 'issue_comment' || event === 'pull_request_review_comment') {
      const comment = (data.comment as Record<string, unknown>)?.body as string || '';
      const command = parseGuardianCommand(comment);
      
      if (command) {
        console.log(`Guardian command received: ${command.command} ${command.args}`);
        
        return c.json({
          status: 'queued',
          command: command.command,
          issue: (data.issue as Record<string, unknown>)?.number,
          repo: (data.repository as Record<string, unknown>)?.full_name,
        });
      }
    }
    
    return c.json({ status: 'ignored' });
    
  } catch (err) {
    logWebhookError(ROOT_DIR, 'github_webhook', err, {
      hasPayload: !!payload!,
    });
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

export { app };

if (require.main === module) {
  const port = parseInt(process.env.GUARDIAN_WEBHOOK_PORT || '3001');
  console.log(`Guardian webhook server starting on port ${port}`);
  serve({ fetch: app.fetch, port });
}
