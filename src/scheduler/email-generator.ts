import dotenv from 'dotenv';
import {
  getTodayAllFarms,
  getActiveRecipients,
  RecipientPreference,
  DailyScrape,
} from '../database/supabase-client.js';
import { renderManagementReport, buildManagementSubject } from '../renderers/management-report.js';
import { renderDailyTechMessage, buildEmailSubject } from '../renderers/daily-tech-message.js';
import { createEmailDelivery } from '../delivery/zoho-email.js';

dotenv.config();

interface EmailToSend {
  recipient: RecipientPreference;
  subject: string;
  body: string;
  farms: DailyScrape[];
}

/**
 * Generate today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get data for specific farms
 */
function filterFarmData(allFarms: DailyScrape[], farmIds?: string[] | null): DailyScrape[] {
  if (!farmIds || farmIds.length === 0) {
    return allFarms;
  }
  return allFarms.filter((farm) => farmIds.includes(farm.farm_id || ''));
}

/**
 * Generate emails for all recipients based on today's scrape data
 */
export async function generateEmails(dryRun: boolean = false): Promise<EmailToSend[]> {
  const todayDate = getTodayDate();
  const emailsToSend: EmailToSend[] = [];

  console.log(`\n========================================`);
  console.log(`Email Generation - Daily Reports`);
  console.log(`Date: ${todayDate}`);
  if (dryRun) {
    console.log(`Mode: DRY RUN (no emails will be sent)`);
  }
  console.log(`========================================\n`);

  try {
    // Step 1: Get today's scrape data for all farms
    console.log('[1/3] Fetching today\'s scrape data...');
    const allFarmData = await getTodayAllFarms(todayDate);

    if (!allFarmData || allFarmData.length === 0) {
      console.error('No scrape data found for today. Aborting.');
      return [];
    }

    console.log(`✅ Found data for ${new Set(allFarmData.map((f) => f.farm_id)).size} farms\n`);

    // Step 2: Get active recipients
    console.log('[2/3] Fetching recipient preferences...');
    const recipients = await getActiveRecipients();

    if (!recipients || recipients.length === 0) {
      console.error('No active recipients configured. Aborting.');
      return [];
    }

    console.log(`✅ Found ${recipients.length} active recipients\n`);

    // Step 3: Generate emails per recipient
    console.log('[3/3] Generating emails...');

    for (const recipient of recipients) {
      try {
        const farmData = filterFarmData(allFarmData, recipient.farm_ids);

        if (farmData.length === 0) {
          console.log(`⚠️ ${recipient.recipient_name}: No data for assigned farms, skipping`);
          continue;
        }

        let subject: string;
        let body: string;

        if (recipient.role === 'management') {
          // Management gets all farms overview
          const scrapeResults = farmData.map((farm) => ({
            farm_name: farm.farm_name,
            kwh_produced: farm.kwh,
            kwh_expected: farm.kwh_expected || 0,
            system_status: farm.status || 'UNKNOWN',
            performance_ratio: 0,
            allSystems: [], // TODO: Include detailed inverter data
          }));

          subject = buildManagementSubject(todayDate);
          body = renderManagementReport(scrapeResults, todayDate);
        } else {
          // Technician gets single farm report
          const farmName = farmData[0].farm_name;
          const scrapeResult = {
            farm_name: farmName,
            kwh_produced: farmData.reduce((sum, f) => sum + (f.kwh || 0), 0),
            kwh_expected: farmData[0].kwh_expected || 0,
            system_status: farmData[0].status || 'UNKNOWN',
            performance_ratio: 0,
            allSystems: [], // TODO: Include detailed inverter data
          };

          subject = buildEmailSubject(farmName, todayDate);
          body = renderDailyTechMessage(scrapeResult, todayDate);
        }

        emailsToSend.push({
          recipient,
          subject,
          body,
          farms: farmData,
        });

        console.log(`✅ Generated for ${recipient.recipient_name} (${recipient.role})`);
      } catch (error) {
        console.error(`✗ Error generating email for ${recipient.recipient_name}:`, error);
      }
    }

    console.log(`\n✅ Generated ${emailsToSend.length} emails\n`);
    return emailsToSend;
  } catch (error) {
    console.error('Error in email generation:', error);
    return [];
  }
}

/**
 * Send generated emails
 */
export async function sendEmails(emails: EmailToSend[], dryRun: boolean = false): Promise<void> {
  console.log(`[SEND] Sending ${emails.length} emails...\n`);

  const emailDelivery = createEmailDelivery(dryRun);
  const emailHealthy = await emailDelivery.healthCheck();

  if (!emailHealthy) {
    console.error('Email configuration invalid. Aborting.');
    return;
  }

  for (const email of emails) {
    try {
      const sent = await emailDelivery.send({
        subject: email.subject,
        body: email.body,
        recipient: email.recipient.recipient_email,
        farmName: email.farms[0].farm_name,
      });

      if (sent) {
        console.log(`✅ Sent to ${email.recipient.recipient_name} (${email.recipient.recipient_email})`);
      } else {
        console.error(`✗ Failed to send to ${email.recipient.recipient_name}`);
      }
    } catch (error) {
      console.error(`✗ Error sending to ${email.recipient.recipient_name}:`, error);
    }
  }

  console.log(`\n========================================`);
  console.log(`Email delivery complete`);
  console.log(`========================================\n`);
}

/**
 * Entry point: orchestrate email generation and sending
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    const emails = await generateEmails(dryRun);

    if (!dryRun && emails.length > 0) {
      await sendEmails(emails, dryRun);
    } else if (dryRun) {
      console.log('[DRY RUN] Emails would be sent:');
      emails.forEach((email) => {
        console.log(`  - To: ${email.recipient.recipient_email} (${email.recipient.role})`);
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
