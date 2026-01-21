"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export type AuthLevel = "none" | "required" | "admin";

interface APIOptionsProps {
  auth: AuthLevel;
  onAuthChange: (value: AuthLevel) => void;
  pagination: boolean;
  onPaginationChange: (value: boolean) => void;
}

export function APIOptions({
  auth,
  onAuthChange,
  pagination,
  onPaginationChange,
}: APIOptionsProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Options</h3>

      <div className="space-y-2">
        <Label htmlFor="auth">Authentication</Label>
        <select
          id="auth"
          value={auth}
          onChange={(e) => onAuthChange(e.target.value as AuthLevel)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="none">None - Public access</option>
          <option value="required">Required - Authenticated users</option>
          <option value="admin">Admin - Admin users only</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="pagination">Pagination</Label>
          <p className="text-xs text-muted-foreground">
            Add pagination to list endpoints
          </p>
        </div>
        <Switch
          id="pagination"
          checked={pagination}
          onCheckedChange={onPaginationChange}
        />
      </div>
    </div>
  );
}
