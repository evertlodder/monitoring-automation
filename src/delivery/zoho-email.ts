import dotenv from 'dotenv';
import fs from 'fs';

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
   * Writes email as HTML file for manual Zoho webmail delivery
   */
  async send(payload: EmailPayload): Promise<boolean> {
    if (this.dryRun) {
      console.log('[DRY RUN] Email would be sent:');
      console.log(`  To: ${this.recipient}`);
      console.log(`  Subject: ${payload.subject}`);
      return true;
    }

    try {
      // Write email as HTML file
      const date = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();
      const filename = `/tmp/email-${date}-${timestamp}.html`;

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${payload.subject}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f9f9f9; }
    .email-container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; border-left: 4px solid #4CAF50; }
    .header p { margin: 8px 0; }
    .header strong { color: #333; }
    .header em { color: #666; }
    .content { white-space: pre-wrap; font-family: 'Courier New', monospace; background: #fafafa; padding: 20px; border: 1px solid #ddd; border-radius: 4px; overflow-x: auto; }
    .footer { color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <p><strong>To:</strong> <em>${this.recipient}</em></p>
      <p><strong>From:</strong> <em>evert@greenspark.co.ke</em></p>
      <p><strong>Subject:</strong> <em>${payload.subject}</em></p>
    </div>
    <div class="content">${payload.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="footer">
      <p>📧 <strong>Email generated for manual delivery via Zoho webmail</strong></p>
      <p>1. Copy the content above (Ctrl+A / Cmd+A)</p>
      <p>2. Open <a href="https://mail.zoho.com">Zoho Mail</a></p>
      <p>3. Click "Compose"</p>
      <p>4. Paste content into the message body</p>
      <p>5. Click Send</p>
    </div>
  </div>
</body>
</html>`;

      fs.writeFileSync(filename, htmlContent);
      console.log(`✅ Email saved to: ${filename}`);
      console.log(`📧 Open this file in a web browser to view the formatted email`);
      console.log(`📋 Copy the content and paste into Zoho Mail composer`);
      return true;
    } catch (error) {
      console.error('Failed to write email file:', error);
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
