import { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { RegisterForm } from "@/components/features/auth/register-form"
import { OAuthButtons } from "@/components/features/auth/oauth-buttons"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export const metadata: Metadata = {
  title: "Create an Account",
  description: "Create a new account to get started with our platform.",
}

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Create an account</CardTitle>
        <CardDescription className="text-center">
          Enter your information to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<div className="flex justify-center py-4"><Spinner /></div>}>
          <OAuthButtons mode="signup" />
        </Suspense>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-300 dark:border-zinc-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <RegisterForm />
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
