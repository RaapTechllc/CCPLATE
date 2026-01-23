import "server-only";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import type { ComponentSpec } from "./spec";
import { suggestPath } from "./generator";

export interface GeneratedComponent {
  name: string;
  path: string;
  content: string;
}

export function validateComponentPath(
  componentPath: string,
  rootDir: string = process.cwd()
): { valid: boolean; fullPath?: string; normalizedPath?: string; error?: string } {
  const normalizedPath = componentPath.replace(/\\/g, "/").trim();

  if (!normalizedPath) {
    return { valid: false, error: "Path is required" };
  }

  if (normalizedPath.startsWith("/")) {
    return { valid: false, error: "Absolute paths are not allowed" };
  }

  if (normalizedPath.includes("..")) {
    return { valid: false, error: "Path traversal is not allowed" };
  }

  if (!normalizedPath.startsWith("src/components/")) {
    return { valid: false, error: "Path must be under src/components" };
  }

  if (!normalizedPath.endsWith(".tsx")) {
    return { valid: false, error: "Component path must end with .tsx" };
  }

  const resolvedRoot = resolve(rootDir);
  const resolvedFullPath = resolve(rootDir, normalizedPath);

  if (!resolvedFullPath.startsWith(resolvedRoot + "/") && resolvedFullPath !== resolvedRoot) {
    return { valid: false, error: "Path escapes project root" };
  }

  return { valid: true, fullPath: resolvedFullPath, normalizedPath };
}

export function writeComponent(
  component: GeneratedComponent,
  rootDir: string = process.cwd()
): { success: boolean; fullPath: string; error?: string } {
  try {
    const validation = validateComponentPath(component.path, rootDir);
    if (!validation.valid || !validation.fullPath) {
      return {
        success: false,
        fullPath: join(rootDir, component.path),
        error: validation.error || "Invalid component path",
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
        error: `File already exists at ${component.path}`,
      };
    }

    writeFileSync(fullPath, component.content, "utf-8");

    return { success: true, fullPath };
  } catch (error) {
    return {
      success: false,
      fullPath: join(rootDir, component.path),
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export function getComponentPath(spec: ComponentSpec, customPath?: string): string {
  if (customPath) {
    if (!customPath.endsWith(".tsx")) {
      return `${customPath}/${toKebabCase(spec.name)}.tsx`;
    }
    return customPath;
  }

  return suggestPath(spec);
}

export function generateExportStatement(spec: ComponentSpec): string {
  return `export { ${spec.name} } from "./${toKebabCase(spec.name)}";`;
}

export function checkPathExists(path: string, rootDir: string = process.cwd()): boolean {
  const validation = validateComponentPath(path, rootDir);
  if (!validation.valid || !validation.fullPath) {
    return false;
  }
  return existsSync(validation.fullPath);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
