import "server-only";
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const SCHEMA_PATH = join(process.cwd(), "prisma/schema.prisma");
const BACKUP_DIR = join(process.cwd(), "prisma/backups");

export function readCurrentSchema(): string {
  return readFileSync(SCHEMA_PATH, "utf-8");
}

export function findModelInSchema(schema: string, modelName: string): string | null {
  const modelRegex = new RegExp(
    `model\\s+${modelName}\\s*\\{[^}]*(?:\\{[^}]*\\}[^}]*)*\\}`,
    "g"
  );
  const match = schema.match(modelRegex);
  return match ? match[0] : null;
}

export function getExistingModelNames(schema: string): string[] {
  const modelRegex = /model\s+(\w+)\s*\{/g;
  const names: string[] = [];
  let match;

  while ((match = modelRegex.exec(schema)) !== null) {
    names.push(match[1]);
  }

  return names;
}

export function modelExists(schema: string, modelName: string): boolean {
  return getExistingModelNames(schema).includes(modelName);
}

export function addModelToSchema(schema: string, modelBlock: string): string {
  const modelNameMatch = modelBlock.match(/model\s+(\w+)\s*\{/);
  if (!modelNameMatch) {
    throw new Error("Invalid model block: could not extract model name");
  }

  const modelName = modelNameMatch[1];

  if (modelExists(schema, modelName)) {
    throw new Error(`Model "${modelName}" already exists in the schema`);
  }

  const trimmedSchema = schema.trimEnd();
  return `${trimmedSchema}\n\n${modelBlock}\n`;
}

export function createBackup(): string {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(BACKUP_DIR, `schema.prisma.backup-${timestamp}`);

  copyFileSync(SCHEMA_PATH, backupPath);

  return backupPath;
}

export function writeSchema(content: string): void {
  writeFileSync(SCHEMA_PATH, content, "utf-8");
}

export function previewSchemaChange(
  currentSchema: string,
  newModel: string
): { before: string; after: string; diff: string } {
  const after = addModelToSchema(currentSchema, newModel);

  const diffLines: string[] = [];
  const newModelLines = newModel.split("\n");

  diffLines.push("--- prisma/schema.prisma");
  diffLines.push("+++ prisma/schema.prisma (with new model)");
  diffLines.push("@@ Addition at end of file @@");

  for (const line of newModelLines) {
    diffLines.push(`+ ${line}`);
  }

  return {
    before: currentSchema,
    after,
    diff: diffLines.join("\n"),
  };
}

export function applyModelToSchema(modelBlock: string): {
  success: boolean;
  backupPath?: string;
  error?: string;
} {
  try {
    const currentSchema = readCurrentSchema();
    const backupPath = createBackup();
    const newSchema = addModelToSchema(currentSchema, modelBlock);
    writeSchema(newSchema);

    return { success: true, backupPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function restoreFromBackup(backupPath: string): boolean {
  try {
    if (!existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }

    copyFileSync(backupPath, SCHEMA_PATH);
    return true;
  } catch {
    return false;
  }
}

export function getRecentBackups(limit = 10): string[] {
  if (!existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = readdirSync(BACKUP_DIR) as string[];

  return files
    .filter((f: string) => f.startsWith("schema.prisma.backup-"))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((f: string) => join(BACKUP_DIR, f));
}
