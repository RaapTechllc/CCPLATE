import { Metadata } from "next";
import Link from "next/link";
import { verifyEmailAction } from "@/lib/actions/auth.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your email address.",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function VerifyEmailPage({ params }: Props) {
  const { token } = await params;
  const result = await verifyEmailAction(token);

  if (!result.success) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl text-center text-red-600">
            Verification Failed
          </CardTitle>
          <CardDescription className="text-center">{result.message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            The verification link may have expired or already been used.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Link
            href="/login"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            Go to Login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <CardTitle className="text-2xl text-center text-green-600">
          Email Verified!
        </CardTitle>
        <CardDescription className="text-center">{result.message}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          Your email has been successfully verified. You can now access all features of
          your account.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Link
          href="/dashboard"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-500"
        >
          Go to Dashboard
        </Link>
      </CardFooter>
    </Card>
  );
}
