import "server-only";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve, join } from "path";
import type { HookSpec } from "./spec";

export interface GeneratedHook {
  spec: HookSpec;
  code: string;
  filename: string;
  path: string;
}

export function validateHookPath(
  hookPath: string,
  rootDir: string = process.cwd()
): { valid: boolean; fullPath?: string; normalizedPath?: string; error?: string } {
  const normalizedPath = hookPath.replace(/\\/g, "/").trim();

  if (!normalizedPath) {
    return { valid: false, error: "Path is required" };
  }

  if (normalizedPath.startsWith("/")) {
    return { valid: false, error: "Absolute paths are not allowed" };
  }

  if (normalizedPath.includes("..")) {
    return { valid: false, error: "Path traversal is not allowed" };
  }

  if (!normalizedPath.startsWith("src/hooks/")) {
    return { valid: false, error: "Path must be under src/hooks" };
  }

  if (!normalizedPath.endsWith(".ts")) {
    return { valid: false, error: "Hook path must end with .ts" };
  }

  const resolvedRoot = resolve(rootDir);
  const resolvedFullPath = resolve(rootDir, normalizedPath);

  if (!resolvedFullPath.startsWith(resolvedRoot + "/") && resolvedFullPath !== resolvedRoot) {
    return { valid: false, error: "Path escapes project root" };
  }

  return { valid: true, fullPath: resolvedFullPath, normalizedPath };
}

export function writeHook(
  hook: GeneratedHook,
  rootDir: string = process.cwd()
): { success: boolean; fullPath: string; error?: string } {
  try {
    const validation = validateHookPath(hook.path, rootDir);
    if (!validation.valid || !validation.fullPath) {
      return {
        success: false,
        fullPath: join(rootDir, hook.path),
        error: validation.error || "Invalid hook path",
      };
    }

    const fullPath = validation.fullPath;
    const dir = dirname(fullPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    if (existsSync(fullPath)) {
      return {
        success: false,
        fullPath,
        error: `File already exists at ${hook.path}`,
      };
    }

    writeFileSync(fullPath, hook.code, "utf-8");

    return { success: true, fullPath };
  } catch (error) {
    return {
      success: false,
      fullPath: join(rootDir, hook.path),
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function getHookPath(filename: string, customPath?: string): string {
  if (customPath) {
    if (!customPath.endsWith(".ts")) {
      return `${customPath}/${filename}`;
    }
    return customPath;
  }

  return `src/hooks/${filename}`;
}

export function checkHookPathExists(
  hookPath: string,
  rootDir: string = process.cwd()
): boolean {
  const validation = validateHookPath(hookPath, rootDir);
  if (!validation.valid || !validation.fullPath) {
    return false;
  }
  return existsSync(validation.fullPath);
}
