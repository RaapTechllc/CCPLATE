import { Metadata } from "next"
import Link from "next/link"
import { ForgotPasswordForm } from "@/components/features/auth/forgot-password-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your password by entering your email address.",
}

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Reset password</CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
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
  )
}
