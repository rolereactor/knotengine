import nodemailer from "nodemailer";
import { Resend } from "resend";
import { EmailTemplates } from "../core/email-templates.js";

/**
 * 📧 Email Service
 *
 * Handles sending transactional emails.
 * Development: Uses Gmail SMTP (nodemailer)
 * Production: Uses Resend API
 */

export class EmailService {
  private static _transporter: nodemailer.Transporter | null = null;
  private static _resend: Resend | null = null;

  /**
   * Check if running in production mode
   */
  private static isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  }

  /**
   * Lazy-load Resend client
   */
  private static getResend(): Resend | null {
    if (!this._resend) {
      const apiKey = process.env.RESEND_API_KEY;

      if (!apiKey) {
        return null;
      }

      this._resend = new Resend(apiKey);
    }

    return this._resend;
  }

  /**
   * Lazy-load Nodemailer (Gmail)
   */
  private static getTransporter(): nodemailer.Transporter | null {
    if (!this._transporter) {
      const smtpHost = process.env.GMAIL_SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.GMAIL_SMTP_PORT || "587");
      const smtpUser = process.env.GMAIL_USER || "";
      const smtpPass = process.env.GMAIL_APP_PASSWORD || "";

      if (!smtpUser || !smtpPass) {
        return null;
      }

      this._transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    return this._transporter;
  }

  private static getFromEmail(): string {
    return process.env.FROM_EMAIL || "KnotEngine <noreply@knotengine.com>";
  }

  /**
   * Core execution layer that routes to Resend (Prod) or Gmail (Dev)
   */
  private static async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    logContext: string;
    attachment?: { filename: string; content: string; contentType: string };
  }): Promise<{ success: boolean; error?: string }> {
    if (this.isProduction()) {
      // 🚀 PRODUCTION: USE RESEND
      const resend = this.getResend();
      if (!resend) {
        console.warn(
          "⚠️ Resend not configured for production. Please add RESEND_API_KEY.",
        );
        return { success: false, error: "Resend not configured" };
      }

      try {
        const emailParams: any = {
          from: this.getFromEmail(),
          to: params.to,
          subject: params.subject,
          html: params.html,
        };

        if (params.attachment) {
          emailParams.attachments = [
            {
              filename: params.attachment.filename,
              content: Buffer.from(params.attachment.content).toString(
                "base64",
              ),
              contentType: params.attachment.contentType,
            },
          ];
        }

        const { data, error } = await resend.emails.send(emailParams);

        if (error) {
          console.error(`❌ Resend error (${params.logContext}):`, error);
          return { success: false, error: error.message };
        }

        console.log(
          `✅ ${params.logContext} email sent via Resend to ${params.to} (${data?.id})`,
        );
        return { success: true };
      } catch (err) {
        console.error(`❌ Resend exception (${params.logContext}):`, err);
        return { success: false, error: "Failed to send email via Resend" };
      }
    } else {
      // 🛠️ DEVELOPMENT: USE GMAIL SMTP
      const transporter = this.getTransporter();
      if (!transporter) {
        console.warn(
          "⚠️ Gmail not configured for development. Please add GMAIL credentials.",
        );
        return { success: false, error: "Gmail not configured" };
      }

      try {
        const mailOptions: any = {
          from: this.getFromEmail(),
          to: params.to,
          subject: params.subject,
          html: params.html,
        };

        if (params.attachment) {
          mailOptions.attachments = [
            {
              filename: params.attachment.filename,
              content: params.attachment.content,
              contentType: params.attachment.contentType,
            },
          ];
        }

        const info = await transporter.sendMail(mailOptions);

        console.log(
          `✅ ${params.logContext} email sent via Gmail to ${params.to} (${info.messageId})`,
        );
        return { success: true };
      } catch (err) {
        console.error(`❌ Gmail error (${params.logContext}):`, err);
        return { success: false, error: "Failed to send email via Gmail" };
      }
    }
  }

  /**
   * Send payment notification email
   */
  static async sendPaymentAlert(params: {
    to: string;
    merchantName: string;
    invoiceId: string;
    amount: string;
    currency: string;
    status: "received" | "confirmed" | "expired" | "overpaid";
    checkoutUrl?: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: `Payment ${params.status === "received" ? "Received" : params.status === "confirmed" ? "Confirmed" : params.status === "overpaid" ? "Overpaid" : "Expired"} - ${params.amount} ${params.currency}`,
      html: EmailTemplates.getPaymentNotificationHtml(params),
      logContext: "Payment",
    });
  }

  /**
   * Send security notification email
   */
  static async sendSecurityAlert(params: {
    to: string;
    merchantName: string;
    action: string;
    description: string;
    ipAddress?: string;
    timestamp: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: `Security Alert: ${params.action}`,
      html: EmailTemplates.getSecurityAlertHtml(params),
      logContext: "Security",
    });
  }

  /**
   * Send billing notification email
   */
  static async sendBillingNotification(params: {
    to: string;
    merchantName: string;
    type:
      | "subscription_charged"
      | "payment_received"
      | "low_balance"
      | "plan_changed";
    amount?: string;
    plan?: string;
    description: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: `Billing Notification: ${params.type.replace("_", " ")}`,
      html: EmailTemplates.getBillingNotificationHtml(params),
      logContext: "Billing",
    });
  }

  /**
   * Send scheduled export email
   */
  static async sendScheduledExport(params: {
    to: string;
    merchantName: string;
    frequency: string;
    dateRange: { from: string; to: string };
    invoiceCount: number;
    totalUsd: number;
    format: string;
    attachment?: { filename: string; content: string; contentType: string };
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: `${params.frequency === "daily" ? "Daily" : "Weekly"} Invoice Export - KnotEngine`,
      html: EmailTemplates.getScheduledExportHtml(params),
      logContext: "Scheduled Export",
      attachment: params.attachment,
    });
  }

  /**
   * Send magic link login email
   */
  static async sendMagicLink(params: {
    to: string;
    magicLink: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: "Sign in to KnotEngine",
      html: EmailTemplates.getMagicLinkHtml(params.magicLink),
      logContext: "Magic link",
    });
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(params: {
    to: string;
    verificationLink: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: "Verify your email - KnotEngine",
      html: EmailTemplates.getVerificationEmailHtml(
        params.verificationLink,
        params.to,
      ),
      logContext: "Verification",
    });
  }

  /**
   * Send team member invitation email
   */
  static async sendTeamInvite(params: {
    to: string;
    merchantName: string;
    inviteToken: string;
    invitedBy: string;
    role: string;
    dashboardUrl: string;
  }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      to: params.to,
      subject: `You're invited to join ${params.merchantName} on KnotEngine`,
      html: EmailTemplates.getTeamInviteHtml(params),
      logContext: "Team Invite",
    });
  }

  /**
   * Test email connectivity
   */
  static async testConnection(): Promise<boolean> {
    if (this.isProduction()) {
      if (!this.getResend()) return false;
      console.log("✅ Resend client initialized for Production");
      return true;
    } else {
      const transporter = this.getTransporter();
      if (!transporter) return false;

      try {
        await transporter.verify();
        console.log("✅ Gmail SMTP connection successful for Development");
        return true;
      } catch (err) {
        console.error("❌ Gmail SMTP connection failed:", err);
        return false;
      }
    }
  }

  /**
   * Get current email service status
   */
  static getStatus(): {
    provider: string;
    configured: boolean;
  } {
    if (this.isProduction()) {
      return {
        provider: "resend",
        configured: !!this.getResend(),
      };
    } else {
      return {
        provider: "gmail",
        configured: !!this.getTransporter(),
      };
    }
  }
}
