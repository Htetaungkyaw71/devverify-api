import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const DEFAULT_FROM_EMAIL =
  process.env.EMAIL_FROM || "no-reply@devverify.online";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || "DevVerify";

const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: "RESEND_API_KEY is missing",
      };
    }

    const { error } = await resend.emails.send({
      from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to send email via Resend";
    return { success: false, error: errorMessage };
  }
};

export const sendVerificationOTP = async (
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> => {
  const result = await sendEmail({
    to: email,
    subject: "Verify Your Email - DevVerify",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Welcome to DevVerify! Please verify your email to complete your registration.</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 30px 0;">
            ${code}
          </p>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you didn't request this verification code, you can safely ignore this email.
          </p>
        </div>
      `,
  });

  if (!result.success) {
    console.error("Failed to send verification OTP:", result.error);
  }

  return result;
};

export const sendPasswordResetOTP = async (
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> => {
  const result = await sendEmail({
    to: email,
    subject: "Reset Your Password - DevVerify",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Use the code below to proceed:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; text-align: center; margin: 30px 0;">
            ${code}
          </p>
          <p>This code will expire in 5 minutes.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
          </p>
        </div>
      `,
  });

  if (!result.success) {
    console.error("Failed to send password reset OTP:", result.error);
  }

  return result;
};
