"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SystemSetting,
  SettingsByCategory,
  BulkSettingUpdate,
} from "@/types/settings";

interface UseSettingsResult {
  settings: SettingsByCategory | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateSettings: (updates: BulkSettingUpdate[]) => Promise<boolean>;
  updating: boolean;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<SettingsByCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/settings?grouped=true");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch settings");
      }

      setSettings(data.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(
    async (updates: BulkSettingUpdate[]): Promise<boolean> => {
      if (!settings) return false;

      // Store previous state for rollback
      const previousSettings = { ...settings };

      // Optimistic update
      const optimisticSettings = { ...settings };
      for (const update of updates) {
        for (const category of Object.keys(optimisticSettings)) {
          const settingIndex = optimisticSettings[category].findIndex(
            (s) => s.key === update.key
          );
          if (settingIndex !== -1) {
            optimisticSettings[category] = [...optimisticSettings[category]];
            optimisticSettings[category][settingIndex] = {
              ...optimisticSettings[category][settingIndex],
              value: update.value,
              type: update.type || optimisticSettings[category][settingIndex].type,
            };
          }
        }
      }
      setSettings(optimisticSettings);

      try {
        setUpdating(true);
        setError(null);

        const response = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to update settings");
        }

        // Refresh to get the latest data from server
        await fetchSettings();
        return true;
      } catch (err) {
        // Rollback on error
        setSettings(previousSettings);
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [settings, fetchSettings]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings,
    updateSettings,
    updating,
  };
}
