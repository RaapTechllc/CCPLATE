interface VerifyEmailProps {
  verifyUrl: string;
  userName?: string;
}

export function generateVerifyEmailTemplate({
  verifyUrl,
  userName,
}: VerifyEmailProps): { html: string; text: string } {
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px;">
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #111827;">Verify Your Email Address</h1>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #4b5563;">${greeting}</p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #4b5563;">
                Thanks for signing up! Please verify your email address by clicking the button below.
              </p>
              <table role="presentation" style="margin: 0 0 24px;">
                <tr>
                  <td style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                This link will expire in 24 hours.
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #6b7280;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9ca3af;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color: #2563eb; word-break: break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${greeting}

Thanks for signing up! Please verify your email address by clicking the link below:

${verifyUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.
  `.trim();

  return { html, text };
}
