import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const fromEmail = process.env.EMAIL_FROM || "noreply@example.com";

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not set. Email not sent:", { to, subject });
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
