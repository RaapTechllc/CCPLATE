import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
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

type SettingDoc = Doc<"systemSettings">;

function toSystemSetting(setting: SettingDoc): SystemSetting {
  const createdAt = setting.createdAt ?? setting._creationTime;
  const updatedAt = setting.updatedAt ?? createdAt;

  return {
    id: setting._id,
    key: setting.key,
    value: setting.value,
    type: setting.type as SettingType,
    category: setting.category,
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
  };
}

/**
 * Get all settings
 */
export async function getAll(
  client: ConvexHttpClient
): Promise<SystemSetting[]> {
  const settings = await client.query(api.settings.getSettings, {});
  return settings.map(toSystemSetting);
}

/**
 * Get all settings grouped by category
 */
export async function getAllGrouped(
  client: ConvexHttpClient
): Promise<SettingsByCategory> {
  const settings = await getAll(client);

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
export async function getByKey(
  client: ConvexHttpClient,
  key: string
): Promise<SystemSetting | null> {
  const setting = await client.query(api.settings.getSettingByKey, { key });

  return setting ? toSystemSetting(setting) : null;
}

/**
 * Get settings by category
 */
export async function getByCategory(
  client: ConvexHttpClient,
  category: string
): Promise<SystemSetting[]> {
  const settings = await client.query(api.settings.getSettings, { category });
  return settings.map(toSystemSetting);
}

/**
 * Update a single setting
 * Creates the setting if it doesn't exist (upsert)
 */
export async function update(
  client: ConvexHttpClient,
  key: string,
  value: string,
  type?: SettingType
): Promise<SystemSetting> {
  const setting = await client.mutation(api.settings.upsertSetting, {
    key,
    value,
    type,
  });

  if (!setting) {
    throw new Error(`Failed to upsert setting: ${key}`);
  }

  return toSystemSetting(setting);
}

/**
 * Bulk update multiple settings
 * Uses a transaction to ensure atomicity
 */
export async function bulkUpdate(
  client: ConvexHttpClient,
  settings: BulkSettingUpdate[]
): Promise<SystemSetting[]> {
  const results = await client.mutation(api.settings.bulkUpsertSettings, {
    settings,
  });

  return results.map(toSystemSetting);
}

/**
 * Initialize default settings if they don't exist
 * Call this during application startup or admin first run
 */
export async function initializeDefaults(
  client: ConvexHttpClient
): Promise<void> {
  const settingKeys = Object.values(SETTING_KEYS);

  // Check which settings already exist
  const existingSettings = (await client.query(
    api.settings.getSettings,
    {}
  )) as SettingDoc[];
  const existingKeys = new Set(existingSettings.map((setting) => setting.key));

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
    await client.mutation(api.settings.bulkUpsertSettings, {
      settings: settingsToCreate,
    });
  }
}

/**
 * Delete a setting by key
 * Use with caution - typically settings should be updated, not deleted
 */
export async function deleteSetting(
  client: ConvexHttpClient,
  key: string
): Promise<void> {
  await client.mutation(api.settings.deleteSetting, { key });
}

/**
 * Check if a setting exists
 */
export async function settingExists(
  client: ConvexHttpClient,
  key: string
): Promise<boolean> {
  const setting = await client.query(api.settings.getSettingByKey, { key });
  return !!setting;
}

/**
 * Get a setting value parsed based on its type
 */
export async function getValue<T = string>(
  client: ConvexHttpClient,
  key: string
): Promise<T | null> {
  const setting = await getByKey(client, key);

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
