"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";
import { updateNameAction } from "@/lib/actions/profile.actions";

interface ProfileNameFormProps {
  defaultName: string;
  email: string;
}

export function ProfileNameForm({ defaultName, email }: ProfileNameFormProps) {
  const [name, setName] = useState(defaultName);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateNameAction(name);

      if (result.success) {
        showToast.success(result.message);
      } else {
        showToast.error(result.message);
      }
    } catch {
      showToast.error("Failed to update name");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            defaultValue={email}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
