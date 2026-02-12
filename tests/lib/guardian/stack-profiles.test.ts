/**
 * Tests for Stack Profiles module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getProfiles,
  getProfile,
  getActiveProfile,
  loadMCPConfig,
  backupMCPConfig,
  restoreMCPConfig,
  activateProfile,
  formatProfileList,
  getConfiguredServers,
  hasMCPServers,
  STACK_PROFILES,
  type StackProfile,
  type MCPConfig,
  type ActiveProfile,
} from "../../../src/lib/guardian/stack-profiles";

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

import { existsSync, readFileSync, writeFileSync, copyFileSync } from "fs";

const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockCopyFileSync = copyFileSync as ReturnType<typeof vi.fn>;

describe("Stack Profiles", () => {
  const rootDir = "/test/root";

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getProfiles", () => {
    it("should return all predefined profiles", () => {
      const profiles = getProfiles();

      expect(profiles).toHaveLength(4);
      expect(profiles[0].id).toBe("beginner-light");
      expect(profiles[1].id).toBe("web-dev");
      expect(profiles[2].id).toBe("backend");
      expect(profiles[3].id).toBe("data-science");
    });

    it("should include context savings for each profile", () => {
      const profiles = getProfiles();

      profiles.forEach((profile) => {
        expect(profile.contextSavings).toBeDefined();
        expect(profile.contextSavings).toContain("%");
      });
    });

    it("should include experience level for each profile", () => {
      const profiles = getProfiles();

      profiles.forEach((profile) => {
        expect(["beginner", "intermediate", "advanced"]).toContain(
          profile.experienceLevel
        );
      });
    });
  });

  describe("getProfile", () => {
    it("should return profile by ID", () => {
      const profile = getProfile("web-dev");

      expect(profile).toBeDefined();
      expect(profile?.name).toBe("Web Development");
    });

    it("should return null for non-existent profile", () => {
      const profile = getProfile("non-existent");

      expect(profile).toBeNull();
    });

    it("should return beginner-light profile", () => {
      const profile = getProfile("beginner-light");

      expect(profile?.name).toBe("Beginner Light");
      expect(profile?.experienceLevel).toBe("beginner");
      expect(profile?.disabledServers).toContain("postgres");
    });

    it("should return backend profile with correct servers", () => {
      const profile = getProfile("backend");

      expect(profile?.enabledServers).toContain("postgres");
      expect(profile?.enabledServers).toContain("docker");
      expect(profile?.disabledServers).toContain("jupyter");
    });
  });

  describe("getActiveProfile", () => {
    it("should return null when no active profile file", () => {
      mockExistsSync.mockReturnValue(false);

      const active = getActiveProfile(rootDir);

      expect(active).toBeNull();
    });

    it("should return active profile from file", () => {
      const activeProfile: ActiveProfile = {
        profileId: "web-dev",
        activatedAt: "2024-01-01T00:00:00Z",
        originalMcpHash: "abc123",
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(activeProfile));

      const active = getActiveProfile(rootDir);

      expect(active).toEqual(activeProfile);
    });

    it("should return null on JSON parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json{");

      const active = getActiveProfile(rootDir);

      expect(active).toBeNull();
    });
  });

  describe("loadMCPConfig", () => {
    it("should return empty config when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const config = loadMCPConfig(rootDir);

      expect(config).toEqual({ mcpServers: {} });
    });

    it("should load MCP config from file", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {
          postgres: {
            command: "pg-server",
            args: [],
          },
          github: {
            command: "gh-server",
            args: [],
          },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      const config = loadMCPConfig(rootDir);

      expect(config).toEqual(mcpConfig);
    });

    it("should return empty config on parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json");

      const config = loadMCPConfig(rootDir);

      expect(config).toEqual({ mcpServers: {} });
    });
  });

  describe("backupMCPConfig", () => {
    it("should fail when no .mcp.json exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = backupMCPConfig(rootDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No .mcp.json found");
    });

    it("should successfully copy config to backup", () => {
      mockExistsSync.mockReturnValue(true);

      const result = backupMCPConfig(rootDir);

      expect(result.success).toBe(true);
      expect(mockCopyFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".mcp.json"),
        expect.stringContaining("mcp-backup.json")
      );
    });

    it("should handle copy errors", () => {
      mockExistsSync.mockReturnValue(true);
      mockCopyFileSync.mockImplementation(() => {
        throw new Error("Copy failed");
      });

      const result = backupMCPConfig(rootDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to backup");
    });
  });

  describe("restoreMCPConfig", () => {
    it("should fail when no backup exists", () => {
      mockExistsSync.mockReturnValue(false);

      const result = restoreMCPConfig(rootDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain("No backup found");
    });

    it("should attempt to copy backup file when successful", () => {
      mockExistsSync.mockImplementation((path) => {
        return String(path).includes("mcp-backup.json");
      });

      restoreMCPConfig(rootDir);

      expect(mockCopyFileSync).toHaveBeenCalled();
    });

    it("should handle restore errors", () => {
      mockExistsSync.mockReturnValue(true);
      mockCopyFileSync.mockImplementation(() => {
        throw new Error("Restore failed");
      });

      const result = restoreMCPConfig(rootDir);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Failed to restore");
    });
  });

  describe("activateProfile", () => {
    it("should fail for non-existent profile", () => {
      const result = activateProfile(rootDir, "non-existent");

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should activate beginner-light profile", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {
          postgres: { command: "pg", args: [] },
          github: { command: "gh", args: [] },
          jupyter: { command: "jp", args: [] },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      const result = activateProfile(rootDir, "beginner-light");

      expect(result.success).toBe(true);
      expect(result.message).toContain("Beginner Light");
      expect(result.changes?.disabled).toContain("postgres");
      expect(result.changes?.disabled).toContain("github");
      expect(result.changes?.disabled).toContain("jupyter");
    });

    it("should activate web-dev profile with correct servers", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {
          postgres: { command: "pg", args: [] },
          github: { command: "gh", args: [] },
          vercel: { command: "vc", args: [] },
          jupyter: { command: "jp", args: [] },
          docker: { command: "dk", args: [] },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      const result = activateProfile(rootDir, "web-dev");

      expect(result.success).toBe(true);

      // Check that writeFileSync was called with config containing only enabled servers
      const savedConfig = JSON.parse(
        mockWriteFileSync.mock.calls.find((call) =>
          call[0].includes(".mcp.json")
        )?.[1] as string
      );

      expect(savedConfig.mcpServers).toHaveProperty("postgres");
      expect(savedConfig.mcpServers).toHaveProperty("github");
      expect(savedConfig.mcpServers).toHaveProperty("vercel");
      expect(savedConfig.mcpServers).not.toHaveProperty("jupyter");
      expect(savedConfig.mcpServers).not.toHaveProperty("docker");
    });

    it("should save active profile state with required fields", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {
          postgres: { command: "pg", args: [] },
          github: { command: "gh", args: [] },
          docker: { command: "dk", args: [] },
          redis: { command: "rd", args: [] },
        },
      };

      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      activateProfile(rootDir, "backend");

      const activeProfileCall = mockWriteFileSync.mock.calls.find((call) =>
        String(call[0]).includes("active-profile.json")
      );

      expect(activeProfileCall).toBeDefined();
      if (activeProfileCall) {
        const savedProfile = JSON.parse(activeProfileCall[1] as string);
        expect(savedProfile.profileId).toBe("backend");
        expect(savedProfile.activatedAt).toBeDefined();
        expect(savedProfile.originalMcpHash).toBeDefined();
      }
    });
  });

  describe("formatProfileList", () => {
    it("should format all profiles", () => {
      const profiles = getProfiles();
      const formatted = formatProfileList(profiles);

      expect(formatted).toContain("Available Profiles:");
      expect(formatted).toContain("Beginner Light");
      expect(formatted).toContain("Web Development");
      expect(formatted).toContain("Backend Development");
      expect(formatted).toContain("Data Science");
    });

    it("should mark active profile", () => {
      const profiles = getProfiles();
      const formatted = formatProfileList(profiles, "web-dev");

      expect(formatted).toContain("Web Development (ACTIVE)");
    });

    it("should include experience level emojis", () => {
      const profiles = getProfiles();
      const formatted = formatProfileList(profiles);

      expect(formatted).toContain("🟢"); // beginner
      expect(formatted).toContain("🟡"); // intermediate
    });

    it("should include context savings", () => {
      const profiles = getProfiles();
      const formatted = formatProfileList(profiles);

      profiles.forEach((profile) => {
        expect(formatted).toContain(profile.contextSavings);
      });
    });
  });

  describe("getConfiguredServers", () => {
    it("should return empty array when no config", () => {
      mockExistsSync.mockReturnValue(false);

      const servers = getConfiguredServers(rootDir);

      expect(servers).toEqual([]);
    });

    it("should return list of configured servers", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {
          postgres: { command: "pg", args: [] },
          github: { command: "gh", args: [] },
          vercel: { command: "vc", args: [] },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      const servers = getConfiguredServers(rootDir);

      expect(servers).toHaveLength(3);
      expect(servers).toContain("postgres");
      expect(servers).toContain("github");
      expect(servers).toContain("vercel");
    });
  });

  describe("hasMCPServers", () => {
    it("should return false when no servers configured", () => {
      mockExistsSync.mockReturnValue(false);

      const has = hasMCPServers(rootDir);

      expect(has).toBe(false);
    });

    it("should return true when servers are configured", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {
          postgres: { command: "pg", args: [] },
        },
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      const has = hasMCPServers(rootDir);

      expect(has).toBe(true);
    });

    it("should return false for empty mcpServers", () => {
      const mcpConfig: MCPConfig = {
        mcpServers: {},
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(mcpConfig));

      const has = hasMCPServers(rootDir);

      expect(has).toBe(false);
    });
  });

  describe("STACK_PROFILES constant", () => {
    it("should have valid profile structure", () => {
      STACK_PROFILES.forEach((profile) => {
        expect(profile.id).toBeDefined();
        expect(profile.name).toBeDefined();
        expect(profile.description).toBeDefined();
        expect(profile.contextSavings).toBeDefined();
        expect(profile.experienceLevel).toBeDefined();
        expect(Array.isArray(profile.enabledServers)).toBe(true);
        expect(Array.isArray(profile.disabledServers)).toBe(true);
      });
    });
  });
});
