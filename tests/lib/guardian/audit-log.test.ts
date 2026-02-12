/**
 * Tests for Audit Log module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  logAudit,
  logSettingChange,
  logPermissionChange,
  logSchemaChange,
  logSecurityEvent,
  logHITLDecision,
  logAuthEvent,
  getAuditEntries,
  formatAuditEntries,
  type AuditEntry,
} from "../../../src/lib/guardian/audit-log";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  appendFileSync: vi.fn(),
  readFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { existsSync, appendFileSync, readFileSync, mkdirSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockAppendFileSync = appendFileSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;

describe("Audit Log", () => {
  const rootDir = "/test/project";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logAudit", () => {
    it("should create audit entry with generated ID", () => {
      const result = logAudit(rootDir, {
        category: "admin_settings",
        action: "setting_changed",
        actor: { type: "user", email: "test@example.com" },
        severity: "info",
      });

      expect(result.id).toMatch(/^audit-\d+-[a-z0-9]+$/);
      expect(result.timestamp).toBeDefined();
    });

    it("should create memory directory if needed", () => {
      logAudit(rootDir, {
        category: "security",
        action: "test",
        actor: { type: "system" },
        severity: "info",
      });

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("memory"),
        { recursive: true }
      );
    });

    it("should append to audit log file", () => {
      logAudit(rootDir, {
        category: "admin_settings",
        action: "test",
        actor: { type: "user" },
        severity: "info",
      });

      expect(mockAppendFileSync).toHaveBeenCalledWith(
        expect.stringContaining("audit-log.jsonl"),
        expect.stringContaining('"category":"admin_settings"')
      );
    });

    it("should include all entry fields", () => {
      const result = logAudit(rootDir, {
        category: "user_management",
        action: "permission_changed",
        actor: {
          id: "user-123",
          email: "admin@example.com",
          type: "user",
        },
        target: {
          type: "user",
          id: "user-456",
          name: "john@example.com",
        },
        details: { role: "admin" },
        metadata: { ip: "192.168.1.1" },
        severity: "warn",
      });

      expect(result.category).toBe("user_management");
      expect(result.actor.email).toBe("admin@example.com");
      expect(result.target?.id).toBe("user-456");
      expect(result.details?.role).toBe("admin");
      expect(result.metadata?.ip).toBe("192.168.1.1");
      expect(result.severity).toBe("warn");
    });
  });

  describe("logSettingChange", () => {
    it("should log setting change", () => {
      const result = logSettingChange(rootDir, {
        settingKey: "maxWorktrees",
        oldValue: 3,
        newValue: 5,
        changedBy: { id: "user-1", email: "admin@example.com" },
      });

      expect(result.category).toBe("admin_settings");
      expect(result.action).toBe("setting_changed");
      expect(result.actor.type).toBe("user");
      expect(result.target?.name).toBe("maxWorktrees");
      expect(result.details?.oldValue).toBe(3);
      expect(result.details?.newValue).toBe(5);
      expect(result.severity).toBe("info");
    });

    it("should include metadata", () => {
      const result = logSettingChange(rootDir, {
        settingKey: "testSetting",
        oldValue: "old",
        newValue: "new",
        changedBy: { email: "admin@example.com" },
        metadata: { sessionId: "sess-123" },
      });

      expect(result.metadata?.sessionId).toBe("sess-123");
    });
  });

  describe("logPermissionChange", () => {
    it("should log permission change", () => {
      const result = logPermissionChange(rootDir, {
        targetUserId: "user-456",
        targetEmail: "john@example.com",
        permission: "write",
        oldRole: "viewer",
        newRole: "editor",
        changedBy: { id: "admin-1", email: "admin@example.com" },
      });

      expect(result.category).toBe("user_management");
      expect(result.action).toBe("permission_changed");
      expect(result.target?.id).toBe("user-456");
      expect(result.target?.name).toBe("john@example.com");
      expect(result.details?.oldRole).toBe("viewer");
      expect(result.details?.newRole).toBe("editor");
      expect(result.severity).toBe("warn");
    });

    it("should work without target email", () => {
      const result = logPermissionChange(rootDir, {
        targetUserId: "user-123",
        permission: "admin",
        changedBy: { email: "admin@example.com" },
      });

      expect(result.target?.id).toBe("user-123");
    });
  });

  describe("logSchemaChange", () => {
    it("should log create operation", () => {
      const result = logSchemaChange(rootDir, {
        operation: "create",
        entityType: "table",
        entityName: "users",
        changedBy: { type: "system" },
      });

      expect(result.category).toBe("schema_change");
      expect(result.action).toBe("schema_create");
      expect(result.target?.type).toBe("table");
      expect(result.target?.name).toBe("users");
      expect(result.severity).toBe("warn");
    });

    it("should mark drop operations as critical", () => {
      const result = logSchemaChange(rootDir, {
        operation: "drop",
        entityType: "table",
        entityName: "old_table",
        changedBy: { type: "user", email: "dev@example.com" },
      });

      expect(result.severity).toBe("critical");
    });

    it("should include migration info", () => {
      const result = logSchemaChange(rootDir, {
        operation: "migrate",
        entityType: "table",
        entityName: "users",
        migration: "20240101_add_column",
        changedBy: { type: "agent" },
      });

      expect(result.details?.migration).toBe("20240101_add_column");
    });

    it("should include worktree ID", () => {
      const result = logSchemaChange(rootDir, {
        operation: "alter",
        entityType: "column",
        entityName: "email",
        changedBy: { type: "agent" },
        worktreeId: "wt-123",
      });

      expect(result.metadata?.worktreeId).toBe("wt-123");
    });

    it("should handle different entity types", () => {
      const types: Array<"table" | "column" | "index" | "constraint"> = 
        ["table", "column", "index", "constraint"];
      
      for (const entityType of types) {
        const result = logSchemaChange(rootDir, {
          operation: "create",
          entityType,
          entityName: "test",
          changedBy: { type: "system" },
        });

        expect(result.target?.type).toBe(entityType);
      }
    });
  });

  describe("logSecurityEvent", () => {
    it("should log security event", () => {
      const result = logSecurityEvent(rootDir, {
        event: "unauthorized_access",
        description: "Attempt to access protected resource",
        actor: { id: "user-123", email: "bad@example.com" },
        severity: "warn",
      });

      expect(result.category).toBe("security");
      expect(result.action).toBe("unauthorized_access");
      expect(result.details?.description).toContain("protected resource");
      expect(result.severity).toBe("warn");
    });

    it("should default to system actor if none provided", () => {
      const result = logSecurityEvent(rootDir, {
        event: "scan_complete",
        description: "Security scan finished",
        severity: "info",
      });

      expect(result.actor.type).toBe("system");
    });

    it("should include metadata", () => {
      const result = logSecurityEvent(rootDir, {
        event: "suspicious_activity",
        description: "Multiple failed login attempts",
        severity: "critical",
        metadata: { ip: "1.2.3.4", userAgent: "BadBot/1.0" },
      });

      expect(result.metadata?.ip).toBe("1.2.3.4");
      expect(result.metadata?.userAgent).toBe("BadBot/1.0");
    });
  });

  describe("logHITLDecision", () => {
    it("should log approved decision", () => {
      const result = logHITLDecision(rootDir, {
        requestId: "hitl-123",
        decision: "approved",
        decidedBy: "admin@example.com",
        reason: "Looks good",
        notes: "Deploy approved",
      });

      expect(result.category).toBe("hitl");
      expect(result.action).toBe("hitl_approved");
      expect(result.target?.id).toBe("hitl-123");
      expect(result.details?.reason).toBe("Looks good");
      expect(result.details?.notes).toBe("Deploy approved");
      expect(result.severity).toBe("info");
    });

    it("should log rejected decision as warning", () => {
      const result = logHITLDecision(rootDir, {
        requestId: "hitl-456",
        decision: "rejected",
        decidedBy: "admin@example.com",
        reason: "Needs more tests",
      });

      expect(result.action).toBe("hitl_rejected");
      expect(result.severity).toBe("warn");
    });

    it("should work without reason and notes", () => {
      const result = logHITLDecision(rootDir, {
        requestId: "hitl-789",
        decision: "approved",
        decidedBy: "admin@example.com",
      });

      expect(result.target?.id).toBe("hitl-789");
    });
  });

  describe("logAuthEvent", () => {
    it("should log successful login", () => {
      const result = logAuthEvent(rootDir, {
        event: "login",
        userId: "user-123",
        email: "user@example.com",
        success: true,
        metadata: { ip: "192.168.1.1" },
      });

      expect(result.category).toBe("auth");
      expect(result.action).toBe("login");
      expect(result.actor.id).toBe("user-123");
      expect(result.actor.email).toBe("user@example.com");
      expect(result.details?.success).toBe(true);
      expect(result.severity).toBe("info");
    });

    it("should log failed login as warning", () => {
      const result = logAuthEvent(rootDir, {
        event: "login_failed",
        email: "hacker@example.com",
        success: false,
        metadata: { ip: "1.2.3.4" },
      });

      expect(result.severity).toBe("warn");
      expect(result.details?.success).toBe(false);
    });

    it("should handle different auth events", () => {
      const events: Array<"login" | "logout" | "login_failed" | "password_reset" | "register"> = 
        ["login", "logout", "login_failed", "password_reset", "register"];
      
      for (const event of events) {
        const result = logAuthEvent(rootDir, {
          event,
          success: true,
        });

        expect(result.action).toBe(event);
      }
    });

    it("should include additional details", () => {
      const result = logAuthEvent(rootDir, {
        event: "login",
        success: true,
        details: { method: "oauth", provider: "google" },
      });

      expect(result.details?.method).toBe("oauth");
      expect(result.details?.provider).toBe("google");
    });
  });

  describe("getAuditEntries", () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it("should return empty array if log doesn't exist", () => {
      mockExistsSync.mockReturnValue(false);
      const entries = getAuditEntries(rootDir);

      expect(entries).toEqual([]);
    });

    it("should parse entries from log file", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        {
          id: "audit-1",
          timestamp: "2024-01-01T10:00:00Z",
          category: "security",
          action: "scan",
          actor: { type: "system" },
          severity: "info",
        },
        {
          id: "audit-2",
          timestamp: "2024-01-01T11:00:00Z",
          category: "auth",
          action: "login",
          actor: { type: "user", email: "test@example.com" },
          severity: "info",
        },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir);

      expect(entries).toHaveLength(2);
    });

    it("should filter by category", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
        { id: "2", timestamp: "2024-01-01T11:00:00Z", category: "auth", action: "test", actor: { type: "user" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, { category: "security" });

      expect(entries).toHaveLength(1);
      expect(entries[0].category).toBe("security");
    });

    it("should filter by severity", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "critical" },
        { id: "2", timestamp: "2024-01-01T11:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, { severity: "critical" });

      expect(entries).toHaveLength(1);
      expect(entries[0].severity).toBe("critical");
    });

    it("should filter by since date", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
        { id: "2", timestamp: "2024-01-02T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, {
        since: new Date("2024-01-02T00:00:00Z"),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("2");
    });

    it("should filter by until date", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
        { id: "2", timestamp: "2024-01-02T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, {
        until: new Date("2024-01-01T12:00:00Z"),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("1");
    });

    it("should filter by actor email", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "auth", action: "login", actor: { type: "user", email: "alice@example.com" }, severity: "info" },
        { id: "2", timestamp: "2024-01-01T11:00:00Z", category: "auth", action: "login", actor: { type: "user", email: "bob@example.com" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, { actor: "alice@example.com" });

      expect(entries).toHaveLength(1);
      expect(entries[0].actor.email).toBe("alice@example.com");
    });

    it("should filter by actor ID", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "auth", action: "test", actor: { type: "user", id: "user-1" }, severity: "info" },
        { id: "2", timestamp: "2024-01-01T11:00:00Z", category: "auth", action: "test", actor: { type: "user", id: "user-2" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, { actor: "user-1" });

      expect(entries).toHaveLength(1);
      expect(entries[0].actor.id).toBe("user-1");
    });

    it("should sort by timestamp descending", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = [
        { id: "1", timestamp: "2024-01-01T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
        { id: "2", timestamp: "2024-01-02T10:00:00Z", category: "security", action: "test", actor: { type: "system" }, severity: "info" },
      ];
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir);

      expect(entries[0].id).toBe("2"); // Most recent first
      expect(entries[1].id).toBe("1");
    });

    it("should apply limit", () => {
      mockExistsSync.mockReturnValue(true);
      const mockEntries = Array.from({ length: 100 }, (_, i) => ({
        id: `audit-${i}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        category: "security" as const,
        action: "test",
        actor: { type: "system" as const },
        severity: "info" as const,
      }));
      mockReadFileSync.mockReturnValue(
        mockEntries.map(e => JSON.stringify(e)).join("\n")
      );

      const entries = getAuditEntries(rootDir, { limit: 10 });

      expect(entries).toHaveLength(10);
    });

    it("should skip malformed JSON lines", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        'invalid json\n{"id":"audit-1","timestamp":"2024-01-01T10:00:00Z","category":"security","action":"test","actor":{"type":"system"},"severity":"info"}\n'
      );

      const entries = getAuditEntries(rootDir);

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("audit-1");
    });

    it("should handle empty lines", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        '\n\n{"id":"audit-1","timestamp":"2024-01-01T10:00:00Z","category":"security","action":"test","actor":{"type":"system"},"severity":"info"}\n\n'
      );

      const entries = getAuditEntries(rootDir);

      expect(entries).toHaveLength(1);
    });
  });

  describe("formatAuditEntries", () => {
    it("should return message for empty entries", () => {
      const output = formatAuditEntries([]);

      expect(output).toBe("No audit entries found");
    });

    it("should format single entry", () => {
      const entries: AuditEntry[] = [
        {
          id: "audit-1",
          timestamp: "2024-01-01T10:00:00Z",
          category: "security",
          action: "scan_complete",
          actor: { type: "system" },
          severity: "info",
        },
      ];

      const output = formatAuditEntries(entries);

      expect(output).toContain("Audit Log (1 entries)");
      expect(output).toContain("security");
      expect(output).toContain("scan_complete");
    });

    it("should use appropriate severity icons", () => {
      const entries: AuditEntry[] = [
        {
          id: "1",
          timestamp: "2024-01-01T10:00:00Z",
          category: "security",
          action: "test",
          actor: { type: "system" },
          severity: "info",
        },
        {
          id: "2",
          timestamp: "2024-01-01T10:00:00Z",
          category: "security",
          action: "test",
          actor: { type: "system" },
          severity: "warn",
        },
        {
          id: "3",
          timestamp: "2024-01-01T10:00:00Z",
          category: "security",
          action: "test",
          actor: { type: "system" },
          severity: "critical",
        },
      ];

      const output = formatAuditEntries(entries);

      expect(output).toContain("⚪");
      expect(output).toContain("🟠");
      expect(output).toContain("🔴");
    });

    it("should show target info", () => {
      const entries: AuditEntry[] = [
        {
          id: "audit-1",
          timestamp: "2024-01-01T10:00:00Z",
          category: "user_management",
          action: "permission_changed",
          actor: { type: "user", email: "admin@example.com" },
          target: { type: "user", id: "user-123", name: "john@example.com" },
          severity: "warn",
        },
      ];

      const output = formatAuditEntries(entries);

      expect(output).toContain("Target: user (john@example.com)");
    });

    it("should show details", () => {
      const entries: AuditEntry[] = [
        {
          id: "audit-1",
          timestamp: "2024-01-01T10:00:00Z",
          category: "admin_settings",
          action: "setting_changed",
          actor: { type: "user", email: "admin@example.com" },
          severity: "info",
          details: { oldValue: 3, newValue: 5 },
        },
      ];

      const output = formatAuditEntries(entries);

      expect(output).toContain("Details:");
      expect(output).toContain('"oldValue":3');
    });

    it("should format timestamps as locale string", () => {
      const entries: AuditEntry[] = [
        {
          id: "audit-1",
          timestamp: "2024-01-15T14:30:00Z",
          category: "security",
          action: "test",
          actor: { type: "system" },
          severity: "info",
        },
      ];

      const output = formatAuditEntries(entries);

      expect(output).toContain("Time:");
    });

    it("should show actor from email, ID, or type", () => {
      const entries: AuditEntry[] = [
        {
          id: "1",
          timestamp: "2024-01-01T10:00:00Z",
          category: "auth",
          action: "test",
          actor: { type: "user", email: "user@example.com" },
          severity: "info",
        },
        {
          id: "2",
          timestamp: "2024-01-01T10:00:00Z",
          category: "auth",
          action: "test",
          actor: { type: "user", id: "user-123" },
          severity: "info",
        },
        {
          id: "3",
          timestamp: "2024-01-01T10:00:00Z",
          category: "auth",
          action: "test",
          actor: { type: "system" },
          severity: "info",
        },
      ];

      const output = formatAuditEntries(entries);

      expect(output).toContain("Actor: user@example.com");
      expect(output).toContain("Actor: user-123");
      expect(output).toContain("Actor: system");
    });
  });
});
