import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const logEvent = mutation({
  args: {
    builder: v.string(),
    eventType: v.string(),
    featureName: v.optional(v.string()),
    estimatedMinutesSaved: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();

    return await ctx.db.insert("builderAnalytics", {
      userId,
      builder: args.builder,
      eventType: args.eventType,
      featureName: args.featureName,
      estimatedMinutesSaved: args.estimatedMinutesSaved,
      durationMs: args.durationMs,
      createdAt: now,
    });
  },
});

export const getUserMetrics = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const events = await ctx.db
      .query("builderAnalytics")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const totalEvents = events.length;
    const totalMinutesSaved = events.reduce(
      (sum, event) => sum + (event.estimatedMinutesSaved ?? 0),
      0
    );

    const byEventType = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
      return acc;
    }, {});

    const byBuilder = events.reduce<Record<string, number>>((acc, event) => {
      acc[event.builder] = (acc[event.builder] ?? 0) + 1;
      return acc;
    }, {});

    const recentEvents = events.slice(0, 20).map((event) => ({
      id: event._id,
      builder: event.builder,
      eventType: event.eventType,
      estimatedMinutesSaved: event.estimatedMinutesSaved,
      createdAt: new Date(event.createdAt).toISOString(),
    }));

    return {
      totalEvents,
      totalMinutesSaved,
      byEventType,
      byBuilder,
      recentEvents,
    };
  },
});
