import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import {
  progressEmitter,
  loadProgressEvents,
  formatProgressUpdate,
  createProgressUpdate,
  type ProgressUpdate,
  type ProgressType,
} from "../../../src/lib/guardian/progress-emitter";

const TEST_DIR = join(process.cwd(), "test-fixtures", "progress-emitter");

describe("Progress Emitter", () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
    mkdirSync(join(TEST_DIR, "memory"), { recursive: true });
    
    progressEmitter.setRootDir(TEST_DIR);
    progressEmitter.clearBuffer();
  });

  afterEach(() => {
    progressEmitter.stopCleanup();
    
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe("createProgressUpdate", () => {
    it("should create a valid progress update", () => {
      const update = createProgressUpdate("task", "running", "Task started");
      
      expect(update.type).toBe("task");
      expect(update.status).toBe("running");
      expect(update.message).toBe("Task started");
      expect(update.timestamp).toBeDefined();
    });

    it("should include optional fields", () => {
      const update = createProgressUpdate("task", "completed", "Done", {
        phaseId: "foundation",
        taskId: "task-1",
        data: { duration: 5000 },
      });
      
      expect(update.phaseId).toBe("foundation");
      expect(update.taskId).toBe("task-1");
      expect(update.data).toEqual({ duration: 5000 });
    });
  });

  describe("formatProgressUpdate", () => {
    it("should format update for display", () => {
      const update: ProgressUpdate = {
        type: "task",
        status: "completed",
        message: "Task done",
        timestamp: "2026-01-26T12:00:00.000Z",
        phaseId: "foundation",
        taskId: "task-1",
      };
      
      const formatted = formatProgressUpdate(update);
      
      expect(formatted).toContain("TASK");
      expect(formatted).toContain("Task done");
      expect(formatted).toContain("foundation");
      expect(formatted).toContain("task-1");
    });

    it("should include status emoji", () => {
      const completedUpdate = createProgressUpdate("task", "completed", "Done");
      const errorUpdate = createProgressUpdate("task", "error", "Failed");
      
      const completedFormatted = formatProgressUpdate(completedUpdate);
      const errorFormatted = formatProgressUpdate(errorUpdate);
      
      expect(completedFormatted).toContain("✅");
      expect(errorFormatted).toContain("❌");
    });
  });

  describe("Subscribe/Unsubscribe", () => {
    it("should subscribe to updates", () => {
      const received: ProgressUpdate[] = [];
      const callback = (update: ProgressUpdate) => received.push(update);
      
      const id = progressEmitter.subscribe(callback);
      
      expect(id).toMatch(/^sub-\d+-[a-z0-9]+$/);
      expect(progressEmitter.getSubscriberCount()).toBe(1);
      
      progressEmitter.unsubscribe(id);
      expect(progressEmitter.getSubscriberCount()).toBe(0);
    });

    it("should filter by event types", () => {
      const received: ProgressUpdate[] = [];
      const callback = (update: ProgressUpdate) => received.push(update);
      
      const id = progressEmitter.subscribe(callback, ["task"]);
      
      progressEmitter.emit(createProgressUpdate("task", "running", "Task update"));
      progressEmitter.emit(createProgressUpdate("build", "running", "Build update"));
      
      expect(received).toHaveLength(1);
      expect(received[0].type).toBe("task");
      
      progressEmitter.unsubscribe(id);
    });
  });

  describe("Event Emission", () => {
    it("should emit to all subscribers", () => {
      const received1: ProgressUpdate[] = [];
      const received2: ProgressUpdate[] = [];
      
      const id1 = progressEmitter.subscribe(update => received1.push(update));
      const id2 = progressEmitter.subscribe(update => received2.push(update));
      
      progressEmitter.emit(createProgressUpdate("workflow", "running", "Started"));
      
      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
      
      progressEmitter.unsubscribe(id1);
      progressEmitter.unsubscribe(id2);
    });

    it("should buffer events", () => {
      progressEmitter.emit(createProgressUpdate("task", "running", "First"));
      progressEmitter.emit(createProgressUpdate("task", "completed", "Second"));
      
      const buffered = progressEmitter.getBufferedEvents();
      
      expect(buffered).toHaveLength(2);
      expect(buffered[0].message).toBe("First");
      expect(buffered[1].message).toBe("Second");
    });

    it("should filter buffered events by type", () => {
      progressEmitter.emit(createProgressUpdate("task", "running", "Task"));
      progressEmitter.emit(createProgressUpdate("build", "running", "Build"));
      
      const buffered = progressEmitter.getBufferedEvents(undefined, ["task"]);
      
      expect(buffered).toHaveLength(1);
      expect(buffered[0].type).toBe("task");
    });

    it("should filter buffered events by time", () => {
      const oldUpdate = createProgressUpdate("task", "running", "Old");
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      
      // Manually set old timestamp
      (oldUpdate as ProgressUpdate).timestamp = oneHourAgo.toISOString();
      
      progressEmitter.emit(oldUpdate);
      progressEmitter.emit(createProgressUpdate("task", "completed", "New"));
      
      const since = new Date(now.getTime() - 60000).toISOString(); // 1 min ago
      const buffered = progressEmitter.getBufferedEvents(since);
      
      expect(buffered).toHaveLength(1);
      expect(buffered[0].message).toBe("New");
    });
  });

  describe("Webhooks", () => {
    it("should register webhooks", () => {
      progressEmitter.registerWebhook({
        url: "https://hooks.slack.com/test",
        type: "slack",
        enabled: true,
      });
      
      const webhooks = progressEmitter.getWebhooks();
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].url).toBe("https://hooks.slack.com/test");
    });

    it("should remove webhooks", () => {
      progressEmitter.registerWebhook({
        url: "https://hooks.slack.com/test",
        type: "slack",
        enabled: true,
      });
      
      const removed = progressEmitter.removeWebhook("https://hooks.slack.com/test");
      expect(removed).toBe(true);
      
      const webhooks = progressEmitter.getWebhooks();
      expect(webhooks).toHaveLength(0);
    });

    it("should replace webhooks with same URL", () => {
      progressEmitter.registerWebhook({
        url: "https://hooks.slack.com/test",
        type: "slack",
        enabled: true,
      });
      
      progressEmitter.registerWebhook({
        url: "https://hooks.slack.com/test",
        type: "slack",
        enabled: false,
        events: ["error"],
      });
      
      const webhooks = progressEmitter.getWebhooks();
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].enabled).toBe(false);
    });
  });

  describe("File Persistence", () => {
    it("should load events from file", () => {
      progressEmitter.emit(createProgressUpdate("task", "running", "Test"));
      
      const events = loadProgressEvents(TEST_DIR);
      
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some(e => e.message === "Test")).toBe(true);
    });

    it("should filter loaded events by time", () => {
      progressEmitter.emit(createProgressUpdate("task", "running", "Now"));
      
      const future = new Date(Date.now() + 60000).toISOString();
      const events = loadProgressEvents(TEST_DIR, future);
      
      expect(events).toHaveLength(0);
    });
  });

  describe("SSE Stream", () => {
    it("should create SSE stream interface", () => {
      const stream = progressEmitter.createSSEStream();
      
      expect(stream.subscribe).toBeDefined();
      expect(stream.unsubscribe).toBeDefined();
      expect(stream.getEvents).toBeDefined();
      
      // Clean up
      stream.unsubscribe(stream.subscribe());
    });

    it("should unsubscribe cleanly", () => {
      const initialCount = progressEmitter.getSubscriberCount();
      
      const stream = progressEmitter.createSSEStream();
      const id = stream.subscribe();
      
      expect(progressEmitter.getSubscriberCount()).toBe(initialCount + 1);
      
      stream.unsubscribe(id);
      
      expect(progressEmitter.getSubscriberCount()).toBe(initialCount);
    });
  });
});
