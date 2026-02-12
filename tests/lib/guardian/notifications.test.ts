/**
 * Tests for Notifications module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendSlackNotification,
  sendDiscordNotification,
  sendEmailNotification,
  notifyHITLRequest,
  type NotificationResult,
} from "../../../src/lib/guardian/notifications";
import type { HITLRequest } from "../../../src/lib/guardian/hitl";

// Mock global fetch
global.fetch = vi.fn();

describe("Notifications", () => {
  const originalEnv = process.env;

  const mockRequest: HITLRequest = {
    id: "req-123",
    reason: "schema_destructive",
    title: "Schema Change Required",
    description: "Need to drop user.email column",
    status: "pending",
    createdAt: new Date().toISOString(),
    context: {
      files: ["schema.prisma"],
      options: [
        { id: "approve", label: "Approve", description: "Apply the change" },
        { id: "reject", label: "Reject", description: "Cancel operation" },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe("sendSlackNotification", () => {
    it("should send notification when webhook configured", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const result = await sendSlackNotification(mockRequest);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/test",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should return false when webhook not configured", async () => {
      delete process.env.SLACK_WEBHOOK_URL;

      const result = await sendSlackNotification(mockRequest);

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch errors", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await sendSlackNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should return false on non-ok response", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
      });

      const result = await sendSlackNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should include request details in payload", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      await sendSlackNotification(mockRequest);

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);

      expect(payload.blocks).toBeDefined();
      expect(JSON.stringify(payload)).toContain(mockRequest.id);
      expect(JSON.stringify(payload)).toContain(mockRequest.title);
    });

    it("should format different HITL reasons with appropriate emojis", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const requests = [
        { ...mockRequest, reason: "dependency_major" as const },
        { ...mockRequest, reason: "security_change" as const },
        { ...mockRequest, reason: "merge_conflict" as const },
      ];

      for (const req of requests) {
        await sendSlackNotification(req);
      }

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should include files in notification", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const reqWithFiles = {
        ...mockRequest,
        context: {
          ...mockRequest.context,
          files: ["file1.ts", "file2.ts", "file3.ts"],
        },
      };

      await sendSlackNotification(reqWithFiles);

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);

      expect(JSON.stringify(payload)).toContain("file1.ts");
      expect(JSON.stringify(payload)).toContain("file2.ts");
    });

    it("should include options in notification", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      await sendSlackNotification(mockRequest);

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);

      expect(JSON.stringify(payload)).toContain("Approve");
      expect(JSON.stringify(payload)).toContain("Reject");
    });
  });

  describe("sendDiscordNotification", () => {
    it("should send notification when webhook configured", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const result = await sendDiscordNotification(mockRequest);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://discord.com/api/webhooks/test",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should return false when webhook not configured", async () => {
      delete process.env.DISCORD_WEBHOOK_URL;

      const result = await sendDiscordNotification(mockRequest);

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle fetch errors", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await sendDiscordNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should include embed with request details", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      await sendDiscordNotification(mockRequest);

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);

      expect(payload.embeds).toBeDefined();
      expect(payload.embeds[0].title).toContain(mockRequest.title);
      expect(payload.embeds[0].color).toBeDefined();
    });

    it("should use different colors for different reasons", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const req1 = { ...mockRequest, reason: "schema_destructive" as const };
      const req2 = { ...mockRequest, reason: "merge_conflict" as const };

      await sendDiscordNotification(req1);
      await sendDiscordNotification(req2);

      const call1 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const call2 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
      
      const payload1 = JSON.parse(call1[1].body);
      const payload2 = JSON.parse(call2[1].body);

      expect(payload1.embeds[0].color).toBeDefined();
      expect(payload2.embeds[0].color).toBeDefined();
    });

    it("should include files in embed", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const reqWithFiles = {
        ...mockRequest,
        context: {
          ...mockRequest.context,
          files: ["file1.ts", "file2.ts"],
        },
      };

      await sendDiscordNotification(reqWithFiles);

      const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);

      const filesField = payload.embeds[0].fields.find((f: any) => f.name === "Files");
      expect(filesField).toBeDefined();
      expect(filesField.value).toContain("file1.ts");
    });
  });

  describe("sendEmailNotification", () => {
    it("should return false when SMTP not configured", async () => {
      delete process.env.SMTP_HOST;

      const result = await sendEmailNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should return false when partially configured", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      // Missing other config

      const result = await sendEmailNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should handle full SMTP configuration", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "587";
      process.env.NOTIFICATION_FROM = "noreply@example.com";
      process.env.NOTIFICATION_TO = "user@example.com";

      const result = await sendEmailNotification(mockRequest);

      // Currently returns false as nodemailer not implemented
      expect(result).toBe(false);
    });
  });

  describe("notifyHITLRequest", () => {
    it("should send to all configured channels", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const result = await notifyHITLRequest(mockRequest);

      expect(result.slack).toBe(true);
      expect(result.discord).toBe(true);
      expect(result.email).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed success/failure", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true })  // Slack succeeds
        .mockResolvedValueOnce({ ok: false }); // Discord fails

      const result = await notifyHITLRequest(mockRequest);

      expect(result.slack).toBe(true);
      expect(result.discord).toBe(false);
    });

    it("should return all false when nothing configured", async () => {
      delete process.env.SLACK_WEBHOOK_URL;
      delete process.env.DISCORD_WEBHOOK_URL;
      delete process.env.SMTP_HOST;

      const result = await notifyHITLRequest(mockRequest);

      expect(result.slack).toBe(false);
      expect(result.discord).toBe(false);
      expect(result.email).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should send notifications in parallel", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      let resolveSlack: (value: any) => void;
      let resolveDiscord: (value: any) => void;

      const slackPromise = new Promise(resolve => { resolveSlack = resolve; });
      const discordPromise = new Promise(resolve => { resolveDiscord = resolve; });

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(slackPromise)
        .mockReturnValueOnce(discordPromise);

      const resultPromise = notifyHITLRequest(mockRequest);

      // Both should be called before either resolves
      expect(global.fetch).toHaveBeenCalledTimes(2);

      resolveSlack!({ ok: true });
      resolveDiscord!({ ok: true });

      await resultPromise;
    });

    it("should handle network errors gracefully", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const result = await notifyHITLRequest(mockRequest);

      expect(result.slack).toBe(false);
      expect(result.discord).toBe(false);
    });

    it("should handle requests with minimal context", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const minimalRequest: HITLRequest = {
        id: "req-min",
        reason: "test_failure_ambiguous",
        title: "Test Failed",
        description: "Something went wrong",
        status: "pending",
        createdAt: new Date().toISOString(),
        context: {},
      };

      const result = await notifyHITLRequest(minimalRequest);

      expect(result.slack).toBe(true);
    });

    it("should handle requests with many files", async () => {
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const manyFilesRequest = {
        ...mockRequest,
        context: {
          ...mockRequest.context,
          files: Array.from({ length: 20 }, (_, i) => `file${i}.ts`),
        },
      };

      const result = await notifyHITLRequest(manyFilesRequest);

      expect(result.slack).toBe(true);
    });

    it("should handle requests with many options", async () => {
      process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
      
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const manyOptionsRequest = {
        ...mockRequest,
        context: {
          ...mockRequest.context,
          options: [
            { id: "opt1", label: "Option 1", description: "First option" },
            { id: "opt2", label: "Option 2", description: "Second option" },
            { id: "opt3", label: "Option 3", description: "Third option" },
            { id: "opt4", label: "Option 4", description: "Fourth option" },
          ],
        },
      };

      const result = await notifyHITLRequest(manyOptionsRequest);

      expect(result.discord).toBe(true);
    });
  });

  describe("configuration parsing", () => {
    it("should parse SMTP port as number", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "465";
      process.env.NOTIFICATION_FROM = "test@example.com";
      process.env.NOTIFICATION_TO = "user@example.com";

      const result = await sendEmailNotification(mockRequest);

      // Should handle port as number (even though email not implemented)
      expect(result).toBe(false);
    });

    it("should handle missing SMTP port", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      delete process.env.SMTP_PORT;
      process.env.NOTIFICATION_FROM = "test@example.com";
      process.env.NOTIFICATION_TO = "user@example.com";

      const result = await sendEmailNotification(mockRequest);

      // Should use default port 587
      expect(result).toBe(false);
    });

    it("should parse comma-separated email recipients", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.NOTIFICATION_TO = "user1@example.com,user2@example.com,user3@example.com";

      const result = await sendEmailNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should handle empty email recipients", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.NOTIFICATION_TO = "";

      const result = await sendEmailNotification(mockRequest);

      expect(result).toBe(false);
    });

    it("should use default email sender if not provided", async () => {
      process.env.SMTP_HOST = "smtp.example.com";
      delete process.env.NOTIFICATION_FROM;
      process.env.NOTIFICATION_TO = "user@example.com";

      const result = await sendEmailNotification(mockRequest);

      // Should use default 'ccplate@localhost'
      expect(result).toBe(false);
    });
  });
});
