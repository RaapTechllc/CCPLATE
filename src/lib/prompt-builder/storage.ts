import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { PromptsFileSchema, type Prompt, type PromptVersion, type PromptVariable } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const PROMPTS_FILE = path.join(DATA_DIR, "prompts.json");
const LEGACY_PROMPTS_FILE = path.join(process.cwd(), "src/lib/prompt-builder/prompts.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadPrompts(): Promise<Prompt[]> {
  try {
    await ensureDataDir();

    if (await fileExists(PROMPTS_FILE)) {
      const data = await fs.readFile(PROMPTS_FILE, "utf-8");
      const parsed = PromptsFileSchema.parse(JSON.parse(data));
      return parsed.prompts;
    }

    if (await fileExists(LEGACY_PROMPTS_FILE)) {
      const legacyData = await fs.readFile(LEGACY_PROMPTS_FILE, "utf-8");
      const parsed = PromptsFileSchema.parse(JSON.parse(legacyData));
      await savePrompts(parsed.prompts);
      return parsed.prompts;
    }

    return [];
  } catch {
    return [];
  }
}

export async function savePrompts(prompts: Prompt[]): Promise<void> {
  await ensureDataDir();
  const data = JSON.stringify({ prompts }, null, 2);
  await fs.writeFile(PROMPTS_FILE, data, "utf-8");
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  const prompts = await loadPrompts();
  return prompts.find((p) => p.id === id) || null;
}

export interface CreatePromptInput {
  name: string;
  description?: string;
  category?: string;
  systemPrompt?: string;
  userPrompt: string;
  variables?: PromptVariable[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  notes?: string;
}

export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  const prompts = await loadPrompts();
  const now = new Date();

  const initialVersion: PromptVersion = {
    id: uuidv4(),
    version: 1,
    systemPrompt: input.systemPrompt,
    userPrompt: input.userPrompt,
    variables: input.variables || [],
    model: input.model,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
    createdAt: now,
    notes: input.notes,
  };

  const newPrompt: Prompt = {
    id: uuidv4(),
    name: input.name,
    description: input.description,
    category: input.category || "general",
    currentVersion: 1,
    versions: [initialVersion],
    createdAt: now,
    updatedAt: now,
  };

  prompts.push(newPrompt);
  await savePrompts(prompts);

  return newPrompt;
}

export interface UpdatePromptInput {
  name?: string;
  description?: string;
  category?: string;
  systemPrompt?: string;
  userPrompt?: string;
  variables?: PromptVariable[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  notes?: string;
}

export async function updatePrompt(
  id: string,
  input: UpdatePromptInput
): Promise<Prompt | null> {
  const prompts = await loadPrompts();
  const index = prompts.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  const prompt = prompts[index];
  const currentVersionData = prompt.versions.find(
    (v) => v.version === prompt.currentVersion
  );

  const hasContentChange =
    input.systemPrompt !== undefined ||
    input.userPrompt !== undefined ||
    input.variables !== undefined ||
    input.model !== undefined ||
    input.temperature !== undefined ||
    input.maxTokens !== undefined;

  if (hasContentChange && currentVersionData) {
    const newVersion: PromptVersion = {
      id: uuidv4(),
      version: prompt.currentVersion + 1,
      systemPrompt: input.systemPrompt ?? currentVersionData.systemPrompt,
      userPrompt: input.userPrompt ?? currentVersionData.userPrompt,
      variables: input.variables ?? currentVersionData.variables,
      model: input.model ?? currentVersionData.model,
      temperature: input.temperature ?? currentVersionData.temperature,
      maxTokens: input.maxTokens ?? currentVersionData.maxTokens,
      createdAt: new Date(),
      notes: input.notes,
    };

    prompt.versions.push(newVersion);
    prompt.currentVersion = newVersion.version;
  }

  if (input.name !== undefined) prompt.name = input.name;
  if (input.description !== undefined) prompt.description = input.description;
  if (input.category !== undefined) prompt.category = input.category;
  prompt.updatedAt = new Date();

  prompts[index] = prompt;
  await savePrompts(prompts);

  return prompt;
}

export async function deletePrompt(id: string): Promise<boolean> {
  const prompts = await loadPrompts();
  const filtered = prompts.filter((p) => p.id !== id);

  if (filtered.length === prompts.length) {
    return false;
  }

  await savePrompts(filtered);
  return true;
}

export async function restoreVersion(
  promptId: string,
  versionNumber: number
): Promise<Prompt | null> {
  const prompts = await loadPrompts();
  const index = prompts.findIndex((p) => p.id === promptId);

  if (index === -1) {
    return null;
  }

  const prompt = prompts[index];
  const versionToRestore = prompt.versions.find((v) => v.version === versionNumber);

  if (!versionToRestore) {
    return null;
  }

  const newVersion: PromptVersion = {
    ...versionToRestore,
    id: uuidv4(),
    version: prompt.currentVersion + 1,
    createdAt: new Date(),
    notes: `Restored from version ${versionNumber}`,
  };

  prompt.versions.push(newVersion);
  prompt.currentVersion = newVersion.version;
  prompt.updatedAt = new Date();

  prompts[index] = prompt;
  await savePrompts(prompts);

  return prompt;
}
