"use server";

import { promises as fs } from "fs";
import path from "path";
import type { TimeRange, EventType, TimelineEvent } from "./types";

const MEMORY_DIR = path.join(process.cwd(), "memory");

function getTimeRangeStart(range: TimeRange): Date {
  const now = new Date();
  switch (range) {
    case "1h":
      return new Date(now.getTime() - 60 * 60 * 1000);
    case "4h":
      return new Date(now.getTime() - 4 * 60 * 60 * 1000);
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "all":
      return new Date(0);
  }
}

function parseToolLog(content: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const lines = content.split("\n").filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^(\d{4}-\d{2}-\d{2}T[\d:.-]+)\s*\|\s*(.*?)\s*\|\s*(.*)$/
    );
    if (match) {
      const [, timestamp, tool, target] = match;
      const toolName = tool?.trim() || "Unknown";
      const targetPath = target?.trim() || "";

      let eventType: EventType = "tool";
      let title = toolName || "Tool use";
      const description = targetPath;

      if (
        toolName.toLowerCase().includes("bash") ||
        toolName.toLowerCase().includes("test")
      ) {
        if (
          targetPath.toLowerCase().includes("test") ||
          targetPath.toLowerCase().includes("jest") ||
          targetPath.toLowerCase().includes("vitest")
        ) {
          eventType = "test";
          title = "Test run";
        } else if (targetPath.toLowerCase().includes("git commit")) {
          eventType = "commit";
          title = "Git commit";
        }
      }

      if (!toolName && !targetPath) {
        title = "Tool activity";
      }

      events.push({
        id: `tool-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        type: eventType,
        timestamp,
        title,
        description: description || title,
        details: { tool: toolName, target: targetPath },
      });
    }
  }

  return events;
}

function parseNudgesLog(content: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const lines = content.split("\n").filter(Boolean);

  for (const line of lines) {
    try {
      const nudge = JSON.parse(line);
      events.push({
        id: `nudge-${nudge.timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "nudge",
        timestamp: nudge.timestamp || new Date().toISOString(),
        title: nudge.type || "Guardian Nudge",
        description: nudge.message || nudge.content || "Nudge emitted",
        details: nudge,
      });
    } catch {
      continue;
    }
  }

  return events;
}

function parseContextLedger(content: string): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  try {
    const ledger = JSON.parse(content);
    if (ledger.consultations && Array.isArray(ledger.consultations)) {
      for (const consultation of ledger.consultations) {
        events.push({
          id: `consultation-${consultation.timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: "consultation",
          timestamp: consultation.timestamp || new Date().toISOString(),
          title: "RLM Consultation",
          description: consultation.query || "Memory consultation",
          details: consultation,
        });
      }
    }
  } catch {
    // Invalid JSON, skip
  }

  return events;
}

export async function getTimelineEvents(
  timeRange: TimeRange = "today",
  eventTypes?: EventType[],
  limit: number = 100
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];
  const rangeStart = getTimeRangeStart(timeRange);

  try {
    const toolLogPath = path.join(MEMORY_DIR, "tool-log.txt");
    const toolLogContent = await fs
      .readFile(toolLogPath, "utf-8")
      .catch(() => "");
    events.push(...parseToolLog(toolLogContent));
  } catch {
    // File doesn't exist or can't be read
  }

  try {
    const nudgesPath = path.join(MEMORY_DIR, "guardian-nudges.jsonl");
    const nudgesContent = await fs
      .readFile(nudgesPath, "utf-8")
      .catch(() => "");
    events.push(...parseNudgesLog(nudgesContent));
  } catch {
    // File doesn't exist or can't be read
  }

  try {
    const ledgerPath = path.join(MEMORY_DIR, "context-ledger.json");
    const ledgerContent = await fs
      .readFile(ledgerPath, "utf-8")
      .catch(() => "");
    events.push(...parseContextLedger(ledgerContent));
  } catch {
    // File doesn't exist or can't be read
  }

  let filtered = events.filter((event) => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= rangeStart;
  });

  if (eventTypes && eventTypes.length > 0) {
    filtered = filtered.filter((event) => eventTypes.includes(event.type));
  }

  filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return filtered.slice(0, limit);
}
