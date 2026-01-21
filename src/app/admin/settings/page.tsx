"use client";

import { useSettings } from "@/hooks/use-settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { showToast } from "@/lib/toast";
import type { SettingType } from "@/types/settings";

// Category display names and descriptions
const CATEGORY_META: Record<string, { title: string; description: string }> = {
  general: {
    title: "General Settings",
    description: "Basic site configuration including name, description, and URL.",
  },
  features: {
    title: "Feature Toggles",
    description: "Enable or disable application features.",
  },
  uploads: {
    title: "Upload Settings",
    description: "Configure file upload restrictions and limits.",
  },
  limits: {
    title: "User Limits",
    description: "Set limits for user resources and quotas.",
  },
};

// Sort order for categories
const CATEGORY_ORDER = ["general", "features", "uploads", "limits"];

export default function AdminSettingsPage() {
  const { settings, loading, error, updateSettings, updating } = useSettings();

  const handleSave = async (
    category: string,
    updates: { key: string; value: string; type?: SettingType }[]
  ): Promise<boolean> => {
    const success = await updateSettings(updates);
    if (success) {
      showToast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully`);
    } else {
      showToast.error("Failed to save settings. Please try again.");
    }
    return success;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Failed to Load Settings
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  // Sort categories according to defined order
  const sortedCategories = Object.keys(settings).sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Manage your application configuration
        </p>
      </div>

      {/* Settings cards by category */}
      <div className="space-y-6">
        {sortedCategories.map((category) => {
          const categorySettings = settings[category];
          const meta = CATEGORY_META[category] || {
            title: category.charAt(0).toUpperCase() + category.slice(1),
            description: `Configure ${category} settings.`,
          };

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{meta.title}</CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsForm
                  settings={categorySettings}
                  category={category}
                  onSave={(updates) => handleSave(category, updates)}
                  loading={updating}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
