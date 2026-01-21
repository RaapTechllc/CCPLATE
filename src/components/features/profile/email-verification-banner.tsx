"use client";

import { useState } from "react";
import { showToast } from "@/lib/toast";
import { sendVerificationEmailAction } from "@/lib/actions/auth.actions";

export function EmailVerificationBanner() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setIsLoading(true);

    try {
      const result = await sendVerificationEmailAction();

      if (result.success) {
        showToast.success(result.message);
        setSent(true);
      } else {
        showToast.error(result.message);
      }
    } catch {
      showToast.error("Failed to send verification email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-yellow-800">Email Not Verified</h3>
          <p className="mt-1 text-sm text-yellow-700">
            Please verify your email address to access all features.
          </p>
        </div>
        <div>
          {sent ? (
            <span className="text-sm text-green-600">Email sent!</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading}
              className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Sending..." : "Resend Verification"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
