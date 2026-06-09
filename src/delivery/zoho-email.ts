import dotenv from 'dotenv';
import fs from 'fs';
import nodemailer from 'nodemailer';

dotenv.config();

export interface EmailPayload {
  subject: string;
  body: string;
  recipient: string;
  farmName: string;
}

/**
 * Zoho Mail Email Delivery
 *
 * In Phase 1A, this is a stub that logs the email to console.
 * Phase 1B will integrate with the Zoho Mail MCP tool to send actual emails.
 *
 * The Zoho Mail MCP tool provides:
 * - mcp__claude_ai_ZOHO_GREENSPARK_LTD__sendEmail
 * - mcp__claude_ai_ZOHO_GREENSPARK_LTD__sendReplyEmail
 *
 * These tools handle the actual sending via the MCP layer.
 */

export class ZohoEmailDelivery {
  private recipient: string;
  private dryRun: boolean;

  constructor(recipient: string, dryRun: boolean = false) {
    this.recipient = recipient;
    this.dryRun = dryRun;
  }

  /**
   * Send email via Zoho Mail (Phase 1B - SMTP)
   *
   * Uses nodemailer with Zoho Mail SMTP
   */
  async send(payload: EmailPayload): Promise<boolean> {
    if (this.dryRun) {
      console.log('[DRY RUN] Email would be sent:');
      console.log(`  To: ${this.recipient}`);
      console.log(`  Subject: ${payload.subject}`);
      return true;
    }

    try {
      // Configure nodemailer with Zoho SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
        port: parseInt(process.env.ZOHO_SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.ZOHO_MAIL_USER || 'evert@greenspark.co.ke',
          pass: process.env.ZOHO_MAIL_PASSWORD || process.env.SOLARWEB_PASSWORD
        }
      });

      // Create HTML email
      const htmlBody = `<html><body><pre style="font-family: monospace; white-space: pre-wrap;">${payload.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;

      // Send email
      const info = await transporter.sendMail({
        from: process.env.ZOHO_MAIL_FROM || 'evert@greenspark.co.ke',
        to: this.recipient,
        subject: payload.subject,
        text: payload.body,
        html: htmlBody
      });

      console.log(`✅ Email sent! Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('Failed to send email via SMTP:', error);
      return false;
    }
  }

  /**
   * Verify email configuration
   */
  async healthCheck(): Promise<boolean> {
    if (!this.recipient || !this.recipient.includes('@')) {
      console.error('Invalid recipient email:', this.recipient);
      return false;
    }

    console.log(`Email delivery configured for: ${this.recipient}`);
    return true;
  }
}

/**
 * Factory function to create email delivery instance
 */
export function createEmailDelivery(dryRun: boolean = false): ZohoEmailDelivery {
  const recipient = process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke';
  return new ZohoEmailDelivery(recipient, dryRun);
}
