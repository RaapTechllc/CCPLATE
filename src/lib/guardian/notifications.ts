import type { HITLRequest } from './hitl';

export interface NotificationConfig {
  slack?: {
    webhookUrl: string;
    channel?: string;
  };
  discord?: {
    webhookUrl: string;
  };
  email?: {
    smtpHost: string;
    smtpPort: number;
    from: string;
    to: string[];
  };
}

export interface NotificationResult {
  slack?: boolean;
  discord?: boolean;
  email?: boolean;
}

function getConfig(): NotificationConfig {
  return {
    slack: process.env.SLACK_WEBHOOK_URL ? {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL,
    } : undefined,
    discord: process.env.DISCORD_WEBHOOK_URL ? {
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    } : undefined,
    email: process.env.SMTP_HOST ? {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      from: process.env.NOTIFICATION_FROM || 'ccplate@localhost',
      to: (process.env.NOTIFICATION_TO || '').split(',').filter(Boolean),
    } : undefined,
  };
}

function formatHITLForSlack(request: HITLRequest): object {
  const reasonEmoji: Record<string, string> = {
    schema_destructive: '🗄️',
    dependency_major: '📦',
    security_change: '🔒',
    data_deletion: '🗑️',
    merge_conflict: '⚔️',
    cost_threshold: '💰',
    loop_detected: '🔄',
    test_failure_ambiguous: '🧪',
    architecture_fork: '🔀',
  };

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${reasonEmoji[request.reason] || '🚨'} HITL Request: ${request.title}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*ID:*\n\`${request.id}\`` },
          { type: 'mrkdwn', text: `*Reason:*\n${request.reason}` },
          { type: 'mrkdwn', text: `*Status:*\n${request.status}` },
          { type: 'mrkdwn', text: `*Created:*\n${request.createdAt}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${request.description}`,
        },
      },
      ...(request.context.files?.length ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Files:*\n${request.context.files.map(f => `• \`${f}\``).join('\n')}`,
        },
      }] : []),
      ...(request.context.options?.length ? [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Options:*\n${request.context.options.map(o => `• *${o.label}*: ${o.description}`).join('\n')}`,
        },
      }] : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve' },
            style: 'primary',
            action_id: `hitl_approve_${request.id}`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Reject' },
            style: 'danger',
            action_id: `hitl_reject_${request.id}`,
          },
        ],
      },
    ],
  };
}

function formatHITLForDiscord(request: HITLRequest): object {
  const reasonColor: Record<string, number> = {
    schema_destructive: 0xff0000,
    dependency_major: 0xffa500,
    security_change: 0xff4500,
    data_deletion: 0xff0000,
    merge_conflict: 0xffff00,
    cost_threshold: 0xffd700,
    loop_detected: 0x9932cc,
    test_failure_ambiguous: 0x00bfff,
    architecture_fork: 0x32cd32,
  };

  return {
    embeds: [{
      title: `🚨 HITL Request: ${request.title}`,
      color: reasonColor[request.reason] || 0xff0000,
      fields: [
        { name: 'ID', value: `\`${request.id}\``, inline: true },
        { name: 'Reason', value: request.reason, inline: true },
        { name: 'Status', value: request.status, inline: true },
        { name: 'Description', value: request.description },
        ...(request.context.files?.length ? [{
          name: 'Files',
          value: request.context.files.map(f => `• \`${f}\``).join('\n'),
        }] : []),
        ...(request.context.options?.length ? [{
          name: 'Options',
          value: request.context.options.map(o => `• **${o.label}**: ${o.description}`).join('\n'),
        }] : []),
      ],
      timestamp: request.createdAt,
    }],
  };
}

export async function sendSlackNotification(request: HITLRequest): Promise<boolean> {
  const config = getConfig();
  if (!config.slack?.webhookUrl) {
    console.log('⚠️  Slack webhook not configured (set SLACK_WEBHOOK_URL)');
    return false;
  }

  try {
    const response = await fetch(config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatHITLForSlack(request)),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

export async function sendDiscordNotification(request: HITLRequest): Promise<boolean> {
  const config = getConfig();
  if (!config.discord?.webhookUrl) {
    console.log('⚠️  Discord webhook not configured (set DISCORD_WEBHOOK_URL)');
    return false;
  }

  try {
    const response = await fetch(config.discord.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatHITLForDiscord(request)),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
    return false;
  }
}

export async function sendEmailNotification(_request: HITLRequest): Promise<boolean> {
  const config = getConfig();
  if (!config.email?.smtpHost) {
    console.log('⚠️  Email not configured (set SMTP_HOST, SMTP_PORT, NOTIFICATION_FROM, NOTIFICATION_TO)');
    return false;
  }

  console.log('📧 Email notifications require nodemailer - implement when needed');
  return false;
}

export async function notifyHITLRequest(request: HITLRequest): Promise<NotificationResult> {
  const results: NotificationResult = {};

  const [slackResult, discordResult, emailResult] = await Promise.all([
    sendSlackNotification(request),
    sendDiscordNotification(request),
    sendEmailNotification(request),
  ]);

  results.slack = slackResult;
  results.discord = discordResult;
  results.email = emailResult;

  return results;
}
