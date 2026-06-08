import dotenv from 'dotenv';

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
   * Send email via Zoho Mail MCP
   *
   * Phase 1A: Log to console and construct payload
   * Phase 1B: Integrate with actual MCP tool call
   */
  async send(payload: EmailPayload): Promise<boolean> {
    if (this.dryRun) {
      console.log('[DRY RUN] Email would be sent:');
      console.log(`  To: ${this.recipient}`);
      console.log(`  Subject: ${payload.subject}`);
      console.log(`  Body length: ${payload.body.length} chars`);
      console.log('');
      console.log('--- EMAIL BODY ---');
      console.log(payload.body);
      console.log('--- END EMAIL BODY ---');
      return true;
    }

    try {
      console.log(`Sending email via Zoho to ${this.recipient}...`);
      console.log(`Subject: ${payload.subject}`);

      // Phase 1B: This will be replaced with actual MCP tool call
      // For now, we just log what would be sent
      console.log('[Phase 1A] Email delivery stub - Phase 1B will integrate actual Zoho MCP');

      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
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
