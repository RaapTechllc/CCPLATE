import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import crypto from 'crypto';

const app = new Hono();

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function parseGuardianCommand(body: string): { command: string; args: string } | null {
  const match = body.match(/@guardian\s+(\w+)(?:\s+(.*))?/i);
  if (!match) return null;
  return { command: match[1].toLowerCase(), args: match[2] || '' };
}

app.post('/webhook/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256') || '';
  const event = c.req.header('x-github-event');
  const payload = await c.req.text();
  
  const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
  if (secret && !verifySignature(payload, signature, secret)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  
  const data = JSON.parse(payload);
  
  if (event === 'issue_comment' || event === 'pull_request_review_comment') {
    const comment = data.comment?.body || '';
    const command = parseGuardianCommand(comment);
    
    if (command) {
      console.log(`Guardian command received: ${command.command} ${command.args}`);
      
      return c.json({
        status: 'queued',
        command: command.command,
        issue: data.issue?.number,
        repo: data.repository?.full_name,
      });
    }
  }
  
  return c.json({ status: 'ignored' });
});

app.get('/health', (c) => c.json({ status: 'ok' }));

export { app };

if (require.main === module) {
  const port = parseInt(process.env.GUARDIAN_WEBHOOK_PORT || '3001');
  console.log(`Guardian webhook server starting on port ${port}`);
  serve({ fetch: app.fetch, port });
}
