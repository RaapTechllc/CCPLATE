import "server-only";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import type { ComponentSpec } from "./spec";
import { suggestPath } from "./generator";

export interface GeneratedComponent {
  name: string;
  path: string;
  content: string;
}

export function writeComponent(
  component: GeneratedComponent,
  rootDir: string = process.cwd()
): { success: boolean; fullPath: string; error?: string } {
  try {
    const fullPath = join(rootDir, component.path);
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
  return existsSync(join(rootDir, path));
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}
