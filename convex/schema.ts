import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Extend the auth tables with our application tables
export default defineSchema({
  // Include Convex Auth tables (handles users, accounts, sessions, etc.)
  ...authTables,

  // Users table - extends auth users with app-specific fields
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.float64()),
    isAnonymous: v.optional(v.boolean()),
    // App-specific fields
    role: v.optional(v.union(v.literal("USER"), v.literal("ADMIN"))),
    lastLoginAt: v.optional(v.float64()),
    deletedAt: v.optional(v.float64()),
    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_deletedAt", ["deletedAt"]),

  // Files table - file metadata storage
  files: defineTable({
    filename: v.string(), // stored filename (UUID-based)
    originalName: v.string(), // original filename from upload
    mimeType: v.string(),
    size: v.number(), // bytes
    url: v.string(), // public URL or path
    storageType: v.union(
      v.literal("LOCAL"),
      v.literal("S3"),
      v.literal("R2")
    ),
    userId: v.id("users"),
    deletedAt: v.optional(v.float64()),
    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_userId", ["userId"])
    .index("by_mimeType", ["mimeType"])
    .index("by_deletedAt", ["deletedAt"]),

  // System settings table
  systemSettings: defineTable({
    key: v.string(),
    value: v.string(),
    type: v.union(
      v.literal("STRING"),
      v.literal("NUMBER"),
      v.literal("BOOLEAN"),
      v.literal("JSON")
    ),
    category: v.string(),
    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // Builder analytics events (feature generation, apply actions, etc.)
  builderAnalytics: defineTable({
    userId: v.id("users"),
    builder: v.string(),
    eventType: v.string(),
    featureName: v.optional(v.string()),
    estimatedMinutesSaved: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    createdAt: v.float64(),
  })
    .index("by_userId", ["userId"])
    .index("by_eventType", ["eventType"])
    .index("by_builder", ["builder"]),
});
