"use client";

import { Label } from "@/components/ui/label";

export type ComponentType = "client" | "server";
export type StylingOption = "tailwind" | "css-modules" | "inline";
export type FeatureOption =
  | "loading-state"
  | "error-state"
  | "empty-state"
  | "pagination"
  | "search"
  | "sorting"
  | "responsive"
  | "dark-mode"
  | "animations";

export interface ComponentOptions {
  type: ComponentType;
  styling: StylingOption;
  features: FeatureOption[];
}

interface OptionsPanelProps {
  options: ComponentOptions;
  onChange: (options: ComponentOptions) => void;
  disabled?: boolean;
}

const FEATURES: { value: FeatureOption; label: string; description: string }[] = [
  { value: "loading-state", label: "Loading State", description: "Show spinner while loading" },
  { value: "error-state", label: "Error State", description: "Display error messages" },
  { value: "empty-state", label: "Empty State", description: "Show message when no data" },
  { value: "pagination", label: "Pagination", description: "Page through results" },
  { value: "search", label: "Search", description: "Filter by search query" },
  { value: "sorting", label: "Sorting", description: "Sort by columns" },
  { value: "responsive", label: "Responsive", description: "Mobile-friendly layout" },
  { value: "dark-mode", label: "Dark Mode", description: "Support dark theme" },
  { value: "animations", label: "Animations", description: "Add transitions" },
];

export function OptionsPanel({ options, onChange, disabled }: OptionsPanelProps) {
  const handleTypeChange = (type: ComponentType) => {
    onChange({ ...options, type });
  };

  const handleStylingChange = (styling: StylingOption) => {
    onChange({ ...options, styling });
  };

  const handleFeatureToggle = (feature: FeatureOption) => {
    const newFeatures = options.features.includes(feature)
      ? options.features.filter((f) => f !== feature)
      : [...options.features, feature];
    onChange({ ...options, features: newFeatures });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Component Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="component-type"
              value="client"
              checked={options.type === "client"}
              onChange={() => handleTypeChange("client")}
              disabled={disabled}
              className="h-4 w-4 text-zinc-900"
            />
            <span className="text-sm">Client Component</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="component-type"
              value="server"
              checked={options.type === "server"}
              onChange={() => handleTypeChange("server")}
              disabled={disabled}
              className="h-4 w-4 text-zinc-900"
            />
            <span className="text-sm">Server Component</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Client components support interactivity. Server components are better for data fetching.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Styling</Label>
        <div className="flex gap-4">
          {(["tailwind", "css-modules", "inline"] as StylingOption[]).map((style) => (
            <label key={style} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="styling"
                value={style}
                checked={options.styling === style}
                onChange={() => handleStylingChange(style)}
                disabled={disabled}
                className="h-4 w-4 text-zinc-900"
              />
              <span className="text-sm capitalize">
                {style === "css-modules" ? "CSS Modules" : style}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Features</Label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((feature) => (
            <label
              key={feature.value}
              className="flex items-start gap-2 cursor-pointer p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={options.features.includes(feature.value)}
                onChange={() => handleFeatureToggle(feature.value)}
                disabled={disabled}
                className="h-4 w-4 mt-0.5 text-zinc-900"
              />
              <div>
                <span className="text-sm font-medium">{feature.label}</span>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
