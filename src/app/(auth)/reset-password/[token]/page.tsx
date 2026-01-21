import { Metadata } from "next";
import Link from "next/link";
import { validatePasswordResetToken } from "@/lib/auth/tokens";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set your new password.",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;
  const user = await validatePasswordResetToken(token);

  if (!user) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-red-600">
            Invalid or Expired Link
          </CardTitle>
          <CardDescription className="text-center">
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Password reset links expire after 1 hour for security reasons.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link
            href="/forgot-password"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Request New Reset Link
          </Link>
          <Link
            href="/login"
            className="text-sm text-center text-muted-foreground hover:underline"
          >
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Set New Password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
