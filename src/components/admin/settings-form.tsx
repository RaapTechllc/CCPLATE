"use client";

import { useState, useCallback } from "react";
import type { SystemSetting, SettingType } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsFormProps {
  settings: SystemSetting[];
  category: string;
  onSave: (
    updates: { key: string; value: string; type?: SettingType }[]
  ) => Promise<boolean>;
  loading?: boolean;
}

// Helper to format setting key for display
function formatSettingKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Helper to parse value based on type
function parseValue(value: string, type: SettingType): string {
  if (type === "BOOLEAN") {
    return value === "true" ? "true" : "false";
  }
  return value;
}

export function SettingsForm({
  settings,
  category,
  onSave,
  loading = false,
}: SettingsFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const setting of settings) {
      initial[setting.key] = setting.value;
    }
    return initial;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = useCallback(
    (key: string, value: string, type: SettingType) => {
      const parsedValue = parseValue(value, type);
      setFormValues((prev) => {
        const next = { ...prev, [key]: parsedValue };
        // Check if any value differs from original
        const changed = settings.some((s) => next[s.key] !== s.value);
        setHasChanges(changed);
        return next;
      });
    },
    [settings]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates = settings
      .filter((setting) => formValues[setting.key] !== setting.value)
      .map((setting) => ({
        key: setting.key,
        value: formValues[setting.key],
        type: setting.type,
      }));

    if (updates.length === 0) return;

    const success = await onSave(updates);
    if (success) {
      setHasChanges(false);
    }
  };

  const renderInput = (setting: SystemSetting) => {
    const value = formValues[setting.key] ?? setting.value;

    switch (setting.type) {
      case "BOOLEAN":
        return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={value === "true"}
              onClick={() =>
                handleChange(
                  setting.key,
                  value === "true" ? "false" : "true",
                  setting.type
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                value === "true"
                  ? "bg-primary"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
              disabled={loading}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  value === "true" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {value === "true" ? "Enabled" : "Disabled"}
            </span>
          </div>
        );

      case "NUMBER":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value, setting.type)}
            disabled={loading}
            className="max-w-xs"
          />
        );

      case "JSON":
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value, setting.type)}
            disabled={loading}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
          />
        );

      case "STRING":
      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value, setting.type)}
            disabled={loading}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {settings.map((setting) => (
        <div key={setting.key} className="space-y-2">
          <Label htmlFor={setting.key} className="text-sm font-medium">
            {formatSettingKey(setting.key)}
          </Label>
          {renderInput(setting)}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Type: {setting.type}
          </p>
        </div>
      ))}

      <div className="flex items-center gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button type="submit" loading={loading} disabled={!hasChanges || loading}>
          Save {category.charAt(0).toUpperCase() + category.slice(1)} Settings
        </Button>
        {hasChanges && (
          <span className="text-sm text-amber-600 dark:text-amber-400">
            You have unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}
