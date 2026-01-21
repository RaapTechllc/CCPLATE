"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserDetails, UserUpdateRequest } from "@/types/admin";

interface UserFormProps {
  user: UserDetails;
  onSubmit: (data: UserUpdateRequest) => Promise<void>;
  loading: boolean;
}

type Role = "USER" | "ADMIN";

interface UserFormInternalProps extends UserFormProps {
  initialName: string;
  initialEmail: string;
  initialRole: Role;
}

function UserFormInternal({ user, onSubmit, loading, initialName, initialEmail, initialRole }: UserFormInternalProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<Role>(initialRole);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.length > 100) {
      newErrors.name = "Name must be 100 characters or less";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const data: UserUpdateRequest = {};

    if (name !== user.name) {
      data.name = name;
    }
    if (email !== user.email) {
      data.email = email;
    }
    if (role !== user.role) {
      data.role = role;
    }

    // Only submit if there are changes
    if (Object.keys(data).length === 0) return;

    await onSubmit(data);
  };

  const hasChanges =
    name !== (user.name || "") || email !== user.email || role !== user.role;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" error={!!errors.name}>
          Name
        </Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter user name"
          error={!!errors.name}
          disabled={loading}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" error={!!errors.email}>
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          error={!!errors.email}
          disabled={loading}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          disabled={loading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="submit" loading={loading} disabled={!hasChanges}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

export function UserForm({ user, onSubmit, loading }: UserFormProps) {
  return (
    <UserFormInternal
      key={user.id}
      user={user}
      onSubmit={onSubmit}
      loading={loading}
      initialName={user.name || ""}
      initialEmail={user.email}
      initialRole={user.role}
    />
  );
}
