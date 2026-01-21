"use server";

import { promises as fs } from "fs";
import path from "path";

export interface GuardianConfig {
  guardian: {
    enabled: boolean;
    nudges: {
      commit: {
        enabled: boolean;
        filesThreshold: number;
        minutesThreshold: number;
      };
      test: {
        enabled: boolean;
      };
      progress: {
        enabled: boolean;
      };
      context: {
        enabled: boolean;
        threshold: number;
      };
      error: {
        enabled: boolean;
      };
    };
    cooldown: {
      minutes: number;
      toolUses: number;
    };
  };
  worktrees: {
    baseDir: string;
    branchPrefix: string;
  };
  lsp: {
    enabled: boolean;
    languages: string[];
  };
  rlm: {
    enabled: boolean;
    maxExcerptLines: number;
    recursionThreshold: number;
    maxRecursionDepth: number;
  };
}

const CONFIG_PATH = path.join(process.cwd(), "ccplate.config.json");

export async function getGuardianConfig(): Promise<GuardianConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(content);
    return config as GuardianConfig;
  } catch {
    return getDefaultConfig();
  }
}

export async function saveGuardianConfig(
  config: GuardianConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingContent = await fs.readFile(CONFIG_PATH, "utf-8");
    const existingConfig = JSON.parse(existingContent);
    
    const mergedConfig = {
      ...existingConfig,
      guardian: config.guardian,
      worktrees: config.worktrees,
      lsp: config.lsp,
      rlm: config.rlm,
    };

    await fs.writeFile(
      CONFIG_PATH,
      JSON.stringify(mergedConfig, null, 2),
      "utf-8"
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save config",
    };
  }
}

function getDefaultConfig(): GuardianConfig {
  return {
    guardian: {
      enabled: true,
      nudges: {
        commit: {
          enabled: true,
          filesThreshold: 5,
          minutesThreshold: 15,
        },
        test: {
          enabled: true,
        },
        progress: {
          enabled: true,
        },
        context: {
          enabled: true,
          threshold: 0.8,
        },
        error: {
          enabled: true,
        },
      },
      cooldown: {
        minutes: 10,
        toolUses: 5,
      },
    },
    worktrees: {
      baseDir: ".worktrees",
      branchPrefix: "ccplate/",
    },
    lsp: {
      enabled: false,
      languages: ["typescript"],
    },
    rlm: {
      enabled: true,
      maxExcerptLines: 50,
      recursionThreshold: 10,
      maxRecursionDepth: 3,
    },
  };
}
