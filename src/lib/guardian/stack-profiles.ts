/**
 * Stack Profiles - MCP Server Toggle System for Context Management
 *
 * Provides predefined profiles that toggle MCP servers based on project type,
 * helping beginners maximize available context for their specific use case.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";

// ============================================================================
// Types
// ============================================================================

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export interface StackProfile {
  id: string;
  name: string;
  description: string;
  contextSavings: string;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  enabledServers: string[];
  disabledServers: string[];
}

export interface ActiveProfile {
  profileId: string;
  activatedAt: string;
  originalMcpHash: string;
}

// ============================================================================
// Profile Definitions
// ============================================================================

export const STACK_PROFILES: StackProfile[] = [
  {
    id: "beginner-light",
    name: "Beginner Light",
    description: "Disables ALL heavy MCPs for maximum context savings. Best for learning Claude Code.",
    contextSavings: "~60-80%",
    experienceLevel: "beginner",
    enabledServers: [],
    disabledServers: ["postgres", "github", "vercel", "docker", "redis", "jupyter", "python"],
  },
  {
    id: "web-dev",
    name: "Web Development",
    description: "Optimized for frontend/fullstack web development. Enables database and deployment tools.",
    contextSavings: "~20-30%",
    experienceLevel: "intermediate",
    enabledServers: ["postgres", "github", "vercel"],
    disabledServers: ["jupyter", "python", "docker", "redis"],
  },
  {
    id: "backend",
    name: "Backend Development",
    description: "Optimized for API and backend development. Enables database, caching, and container tools.",
    contextSavings: "~20-30%",
    experienceLevel: "intermediate",
    enabledServers: ["postgres", "docker", "redis", "github"],
    disabledServers: ["jupyter", "python", "vercel"],
  },
  {
    id: "data-science",
    name: "Data Science",
    description: "Optimized for data analysis and ML work. Enables Python and Jupyter notebook support.",
    contextSavings: "~20-30%",
    experienceLevel: "intermediate",
    enabledServers: ["jupyter", "python", "postgres"],
    disabledServers: ["vercel", "docker", "redis"],
  },
];

// ============================================================================
// Paths
// ============================================================================

function getPaths(rootDir: string) {
  return {
    mcpConfig: join(rootDir, ".mcp.json"),
    mcpBackup: join(rootDir, "memory", "mcp-backup.json"),
    activeProfile: join(rootDir, "memory", "active-profile.json"),
  };
}

// ============================================================================
// Profile Management
// ============================================================================

/**
 * Get all available profiles
 */
export function getProfiles(): StackProfile[] {
  return STACK_PROFILES;
}

/**
 * Get a profile by ID
 */
export function getProfile(profileId: string): StackProfile | null {
  return STACK_PROFILES.find(p => p.id === profileId) || null;
}

/**
 * Get the currently active profile
 */
export function getActiveProfile(rootDir: string): ActiveProfile | null {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.activeProfile)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(paths.activeProfile, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Load the current MCP configuration
 */
export function loadMCPConfig(rootDir: string): MCPConfig {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.mcpConfig)) {
    return { mcpServers: {} };
  }

  try {
    return JSON.parse(readFileSync(paths.mcpConfig, "utf-8"));
  } catch {
    return { mcpServers: {} };
  }
}

/**
 * Save MCP configuration
 */
function saveMCPConfig(rootDir: string, config: MCPConfig): void {
  const paths = getPaths(rootDir);
  writeFileSync(paths.mcpConfig, JSON.stringify(config, null, 2) + "\n");
}

/**
 * Create a simple hash of the MCP config for change detection
 */
function hashMCPConfig(config: MCPConfig): string {
  const json = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Backup the current MCP configuration
 */
export function backupMCPConfig(rootDir: string): { success: boolean; message: string } {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.mcpConfig)) {
    return { success: false, message: "No .mcp.json found to backup" };
  }

  try {
    copyFileSync(paths.mcpConfig, paths.mcpBackup);
    return { success: true, message: "MCP configuration backed up" };
  } catch (error) {
    return {
      success: false,
      message: `Failed to backup: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Restore MCP configuration from backup
 */
export function restoreMCPConfig(rootDir: string): { success: boolean; message: string } {
  const paths = getPaths(rootDir);

  if (!existsSync(paths.mcpBackup)) {
    return { success: false, message: "No backup found at memory/mcp-backup.json" };
  }

  try {
    copyFileSync(paths.mcpBackup, paths.mcpConfig);

    // Clear active profile
    if (existsSync(paths.activeProfile)) {
      writeFileSync(paths.activeProfile, "");
    }

    return { success: true, message: "MCP configuration restored from backup" };
  } catch (error) {
    return {
      success: false,
      message: `Failed to restore: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

/**
 * Activate a profile by modifying .mcp.json
 */
export function activateProfile(
  rootDir: string,
  profileId: string
): { success: boolean; message: string; changes?: { enabled: string[]; disabled: string[] } } {
  const profile = getProfile(profileId);

  if (!profile) {
    return { success: false, message: `Profile '${profileId}' not found` };
  }

  const paths = getPaths(rootDir);
  const currentConfig = loadMCPConfig(rootDir);

  // Backup current config if this is the first activation
  const activeProfile = getActiveProfile(rootDir);
  if (!activeProfile) {
    backupMCPConfig(rootDir);
  }

  // Track changes
  const changes = {
    enabled: [] as string[],
    disabled: [] as string[],
  };

  // Create new config based on profile
  const newConfig: MCPConfig = { mcpServers: {} };

  // If we have a backup, use it as the source of truth for available servers
  let sourceConfig = currentConfig;
  if (existsSync(paths.mcpBackup)) {
    try {
      sourceConfig = JSON.parse(readFileSync(paths.mcpBackup, "utf-8"));
    } catch {
      // Use current config if backup is invalid
    }
  }

  // Apply profile rules
  for (const [serverId, serverConfig] of Object.entries(sourceConfig.mcpServers)) {
    if (profile.disabledServers.includes(serverId)) {
      // Server should be disabled
      changes.disabled.push(serverId);
    } else if (profile.enabledServers.length === 0 || profile.enabledServers.includes(serverId)) {
      // Server should be enabled (empty enabledServers means keep all except disabled)
      newConfig.mcpServers[serverId] = serverConfig;
      if (!currentConfig.mcpServers[serverId]) {
        changes.enabled.push(serverId);
      }
    }
  }

  // Save new config
  saveMCPConfig(rootDir, newConfig);

  // Save active profile state
  const newActiveProfile: ActiveProfile = {
    profileId,
    activatedAt: new Date().toISOString(),
    originalMcpHash: hashMCPConfig(sourceConfig),
  };
  writeFileSync(paths.activeProfile, JSON.stringify(newActiveProfile, null, 2) + "\n");

  return {
    success: true,
    message: `Profile '${profile.name}' activated. Context savings: ${profile.contextSavings}`,
    changes,
  };
}

/**
 * Format profiles for display
 */
export function formatProfileList(profiles: StackProfile[], activeProfileId?: string): string {
  let output = "Available Profiles:\n\n";

  for (const profile of profiles) {
    const isActive = profile.id === activeProfileId;
    const marker = isActive ? " (ACTIVE)" : "";
    const levelEmoji = profile.experienceLevel === "beginner" ? "🟢" :
                       profile.experienceLevel === "intermediate" ? "🟡" : "🔴";

    output += `${levelEmoji} ${profile.name}${marker}\n`;
    output += `   ID: ${profile.id}\n`;
    output += `   ${profile.description}\n`;
    output += `   Context Savings: ${profile.contextSavings}\n\n`;
  }

  return output;
}

/**
 * Get MCP servers currently configured
 */
export function getConfiguredServers(rootDir: string): string[] {
  const config = loadMCPConfig(rootDir);
  return Object.keys(config.mcpServers);
}

/**
 * Check if any MCP servers are configured
 */
export function hasMCPServers(rootDir: string): boolean {
  return getConfiguredServers(rootDir).length > 0;
}
