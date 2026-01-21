import { prisma } from "@/lib/db";
import type {
  SystemSetting,
  SettingType,
  BulkSettingUpdate,
  SettingsByCategory,
} from "@/types/settings";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/types/settings";

/**
 * Settings Service
 * Handles system settings CRUD operations
 */

/**
 * Get all settings
 */
export async function getAll(): Promise<SystemSetting[]> {
  const settings = await prisma.systemSetting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return settings.map((setting) => ({
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type as SettingType,
    category: setting.category,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  }));
}

/**
 * Get all settings grouped by category
 */
export async function getAllGrouped(): Promise<SettingsByCategory> {
  const settings = await getAll();

  return settings.reduce<SettingsByCategory>((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {});
}

/**
 * Get a single setting by key
 */
export async function getByKey(key: string): Promise<SystemSetting | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!setting) {
    return null;
  }

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type as SettingType,
    category: setting.category,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}

/**
 * Get settings by category
 */
export async function getByCategory(category: string): Promise<SystemSetting[]> {
  const settings = await prisma.systemSetting.findMany({
    where: { category },
    orderBy: { key: "asc" },
  });

  return settings.map((setting) => ({
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type as SettingType,
    category: setting.category,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  }));
}

/**
 * Update a single setting
 * Creates the setting if it doesn't exist (upsert)
 */
export async function update(
  key: string,
  value: string,
  type?: SettingType
): Promise<SystemSetting> {
  // Get existing setting to preserve category if not provided
  const existing = await prisma.systemSetting.findUnique({
    where: { key },
  });

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    create: {
      key,
      value,
      type: type ?? "STRING",
      category: existing?.category ?? "general",
    },
    update: {
      value,
      ...(type && { type }),
    },
  });

  return {
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type as SettingType,
    category: setting.category,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}

/**
 * Bulk update multiple settings
 * Uses a transaction to ensure atomicity
 */
export async function bulkUpdate(
  settings: BulkSettingUpdate[]
): Promise<SystemSetting[]> {
  // Get existing settings to preserve categories
  const existingSettings = await prisma.systemSetting.findMany({
    where: {
      key: { in: settings.map((s) => s.key) },
    },
  });

  const existingMap = new Map(
    existingSettings.map((s) => [s.key, s])
  );

  // Perform all updates in a transaction
  const results = await prisma.$transaction(
    settings.map((setting) => {
      const existing = existingMap.get(setting.key);
      return prisma.systemSetting.upsert({
        where: { key: setting.key },
        create: {
          key: setting.key,
          value: setting.value,
          type: setting.type ?? "STRING",
          category: existing?.category ?? "general",
        },
        update: {
          value: setting.value,
          ...(setting.type && { type: setting.type }),
        },
      });
    })
  );

  return results.map((setting) => ({
    id: setting.id,
    key: setting.key,
    value: setting.value,
    type: setting.type as SettingType,
    category: setting.category,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  }));
}

/**
 * Initialize default settings if they don't exist
 * Call this during application startup or admin first run
 */
export async function initializeDefaults(): Promise<void> {
  const settingKeys = Object.values(SETTING_KEYS);

  // Check which settings already exist
  const existingSettings = await prisma.systemSetting.findMany({
    where: {
      key: { in: settingKeys },
    },
    select: { key: true },
  });

  const existingKeys = new Set(existingSettings.map((s) => s.key));

  // Create missing settings
  const settingsToCreate = settingKeys
    .filter((key) => !existingKeys.has(key))
    .map((key) => {
      const defaultSetting = DEFAULT_SETTINGS[key];
      return {
        key,
        value: defaultSetting.value,
        type: defaultSetting.type,
        category: defaultSetting.category,
      };
    });

  if (settingsToCreate.length > 0) {
    await prisma.systemSetting.createMany({
      data: settingsToCreate,
    });
  }
}

/**
 * Delete a setting by key
 * Use with caution - typically settings should be updated, not deleted
 */
export async function deleteSetting(key: string): Promise<void> {
  await prisma.systemSetting.delete({
    where: { key },
  });
}

/**
 * Check if a setting exists
 */
export async function settingExists(key: string): Promise<boolean> {
  const count = await prisma.systemSetting.count({
    where: { key },
  });
  return count > 0;
}

/**
 * Get a setting value parsed based on its type
 */
export async function getValue<T = string>(key: string): Promise<T | null> {
  const setting = await getByKey(key);

  if (!setting) {
    return null;
  }

  switch (setting.type) {
    case "NUMBER":
      return Number(setting.value) as T;
    case "BOOLEAN":
      return (setting.value === "true") as T;
    case "JSON":
      try {
        return JSON.parse(setting.value) as T;
      } catch {
        return setting.value as T;
      }
    default:
      return setting.value as T;
  }
}
