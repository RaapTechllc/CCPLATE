import { Metadata } from "next";
import { Suspense } from "react";
import { OAuthButtons } from "@/components/features/auth/oauth-buttons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your account to access your dashboard and settings.",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign in</CardTitle>
        <CardDescription className="text-center">
          Choose a provider to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense
          fallback={
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          }
        >
          <OAuthButtons mode="signin" />
        </Suspense>
      </CardContent>
    </Card>
  );
}
