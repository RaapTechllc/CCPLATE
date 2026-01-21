"use client";

import { Label } from "@/components/ui/label";

interface ComponentInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ComponentInput({ value, onChange, disabled }: ComponentInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="description">Component Description</Label>
      <textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Describe the component you want to create. For example:

• A user profile card showing avatar, name, email, and a follow button
• A data table for displaying products with sorting, pagination, and search
• A contact form with name, email, message fields and validation
• A notification list showing unread alerts with dismiss functionality"
        className="w-full min-h-[160px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <p className="text-xs text-muted-foreground">
        Be specific about props, data types, and user interactions you need.
      </p>
    </div>
  );
}
