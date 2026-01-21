import { promises as fs } from "fs";
import path from "path";
import type { Agent, CreateAgentInput, UpdateAgentInput } from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const AGENTS_FILE = path.join(DATA_DIR, "agents.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function loadAgents(): Promise<Agent[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(AGENTS_FILE, "utf-8");
    const agents = JSON.parse(data) as Agent[];
    return agents.map((a) => ({
      ...a,
      createdAt: new Date(a.createdAt),
      updatedAt: new Date(a.updatedAt),
    }));
  } catch {
    return [];
  }
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), "utf-8");
}

export async function getAgent(id: string): Promise<Agent | null> {
  const agents = await loadAgents();
  return agents.find((a) => a.id === id) || null;
}

export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  const agents = await loadAgents();
  const now = new Date();
  const agent: Agent = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  agents.push(agent);
  await saveAgents(agents);
  return agent;
}

export async function updateAgent(
  id: string,
  input: UpdateAgentInput
): Promise<Agent | null> {
  const agents = await loadAgents();
  const index = agents.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const updated: Agent = {
    ...agents[index],
    ...input,
    updatedAt: new Date(),
  };
  agents[index] = updated;
  await saveAgents(agents);
  return updated;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const agents = await loadAgents();
  const index = agents.findIndex((a) => a.id === id);
  if (index === -1) return false;

  agents.splice(index, 1);
  await saveAgents(agents);
  return true;
}

function generateId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
