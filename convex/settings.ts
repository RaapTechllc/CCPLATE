import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

// Get all settings (optionally by category)
export const getSettings = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, { category }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Settings require admin access
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    let settings;
    if (category) {
      settings = await ctx.db
        .query("systemSettings")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else {
      settings = await ctx.db.query("systemSettings").collect();
    }

    settings.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.key.localeCompare(b.key);
    });

    return settings;
  },
});

// Get setting by key
export const getSettingByKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    return setting;
  },
});

// Create or update setting (admin only)
export const upsertSetting = mutation({
  args: {
    key: v.string(),
    value: v.string(),
    type: v.optional(
      v.union(
        v.literal("STRING"),
        v.literal("NUMBER"),
        v.literal("BOOLEAN"),
        v.literal("JSON")
      )
    ),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { key, value, type, category }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    // Check if setting exists
    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value,
        ...(type && { type }),
        ...(category && { category }),
        updatedAt: now,
      });
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("systemSettings", {
      key,
      value,
      type: type ?? "STRING",
      category: category ?? "general",
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const bulkUpsertSettings = mutation({
  args: {
    settings: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
        type: v.optional(
          v.union(
            v.literal("STRING"),
            v.literal("NUMBER"),
            v.literal("BOOLEAN"),
            v.literal("JSON")
          )
        ),
        category: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { settings }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    const now = Date.now();
    const existingSettings = await ctx.db.query("systemSettings").collect();
    const existingMap = new Map(
      existingSettings.map((setting) => [setting.key, setting])
    );

    const results = [];
    for (const setting of settings) {
      const existing = existingMap.get(setting.key);
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: setting.value,
          ...(setting.type && { type: setting.type }),
          ...(setting.category && { category: setting.category }),
          updatedAt: now,
        });
        const updated = await ctx.db.get(existing._id);
        if (updated) {
          results.push(updated);
        }
      } else {
        const id = await ctx.db.insert("systemSettings", {
          key: setting.key,
          value: setting.value,
          type: setting.type ?? "STRING",
          category: setting.category ?? "general",
          createdAt: now,
          updatedAt: now,
        });
        const created = await ctx.db.get(id);
        if (created) {
          results.push(created);
        }
      }
    }

    results.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.key.localeCompare(b.key);
    });

    return results;
  },
});

// Delete setting (admin only)
export const deleteSetting = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }

    const setting = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (setting) {
      await ctx.db.delete(setting._id);
    }

    return { success: true };
  },
});
