import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

export interface SendPasswordResetOptions {
  toEmail: string;
  resetToken: string;
  recipientName?: string;
}

export interface EmailSendResult {
  success: boolean;
  isMock: boolean;
  messageId?: string;
  resetUrl: string;
}

/**
 * Creates the appropriate nodemailer transporter based on environment config.
 */
function createTransporter() {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return null;
}

/**
 * Sends a password reset email to a user with their secure, single-use token.
 * Falls back to an observable development log adapter if SMTP is unconfigured.
 */
export async function sendPasswordResetEmail(options: SendPasswordResetOptions): Promise<EmailSendResult> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${options.resetToken}`;
  const transporter = createTransporter();

  if (!transporter) {
    // Development fallback adapter: log safe observable link to stdout for local testing
    logger.info(`[Email Service - Dev Adapter] Password reset requested for ${options.toEmail}`);
    logger.info(`[Email Service - Dev Adapter] Reset Link: ${resetUrl}`);
    return {
      success: true,
      isMock: true,
      resetUrl,
    };
  }

  const mailOptions = {
    from: env.SMTP_FROM,
    to: options.toEmail,
    subject: 'Brightloop — Password Reset Request',
    text: `Hello ${options.recipientName || 'there'},\n\nA password reset was requested for your Brightloop account. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.\n\nBest regards,\nBrightloop Software Security Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Brightloop Password Reset</h2>
        <p style="color: #475569; font-size: 16px;">Hello ${options.recipientName || 'there'},</p>
        <p style="color: #475569; font-size: 16px;">A password reset was requested for your account. Click the button below to choose a new password:</p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">This link will expire in 1 hour. If you did not initiate this request, you can safely disregard this message.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`[Email Service] Password reset email sent to ${options.toEmail} (ID: ${info.messageId})`);
    return {
      success: true,
      isMock: false,
      messageId: info.messageId,
      resetUrl,
    };
  } catch (error) {
    logger.error(`[Email Service] Failed to send email to ${options.toEmail}:`, error);
    // Return gracefully with error state; do not crash caller
    return {
      success: false,
      isMock: false,
      resetUrl,
    };
  }
}
