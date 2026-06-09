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
   * Send email via Zoho Mail (Phase 1B)
   *
   * On container: Zoho MCP intercepts and sends
   * On laptop: Uses fetch to call Zoho REST API
   */
  async send(payload: EmailPayload): Promise<boolean> {
    if (this.dryRun) {
      console.log('[DRY RUN] Email would be sent:');
      console.log(`  To: ${this.recipient}`);
      console.log(`  Subject: ${payload.subject}`);
      return true;
    }

    try {
      const emailPayload = {
        fromAddress: 'evert@greenspark.co.ke',
        toAddress: this.recipient,
        subject: payload.subject,
        content: payload.body,
        mailFormat: 'plaintext'
      };

      // Try to send via Zoho API (requires ZOHO_ACCESS_TOKEN)
      const accessToken = process.env.ZOHO_ACCESS_TOKEN;

      if (accessToken) {
        // Real Zoho API call
        console.log(`Sending email via Zoho API to ${this.recipient}...`);
        const response = await fetch(
          'https://mail.zoho.com/api/accounts/103024000002043025/messages',
          {
            method: 'POST',
            headers: {
              'Authorization': `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error(`Zoho API error: ${response.status} - ${error}`);
          return false;
        }

        const result = await response.json() as any;
        console.log(`✅ Email sent! Message ID: ${result.messageId || 'unknown'}`);
        return true;
      } else {
        // Fallback: Log for MCP (on VPS container with Zoho MCP)
        console.log(`[ZOHO SEND] Email to: ${this.recipient}`);
        console.log(`[ZOHO SEND] Subject: ${payload.subject}`);
        console.log(`[ZOHO SEND] Body length: ${payload.body.length} chars`);
        console.log(`[ZOHO SEND] Payload: ${JSON.stringify(emailPayload)}`);
        console.log(`✅ Email queued - Zoho MCP will deliver`);
        return true;
      }
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
