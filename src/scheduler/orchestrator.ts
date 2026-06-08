import dotenv from 'dotenv';
import { SolarWebScraper } from '../scraper/playwright-scraper.js';
import { insertDailyScrape, insertDailyEmail, healthCheck } from '../database/supabase-client.js';
import { renderDailyTechMessage, buildEmailSubject } from '../renderers/daily-tech-message.js';
import { createEmailDelivery } from '../delivery/zoho-email.js';

dotenv.config();

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in human-readable format
 */
function getTodayFormatted(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  return `${day}-${month}-${year}`;
}

/**
 * Main orchestrator: scrape -> insert -> render -> send
 */
export async function runDailyWorkflow(dryRun: boolean = false): Promise<void> {
  const timestamp = new Date().toISOString();
  const todayDate = getTodayDate();
  const todayFormatted = getTodayFormatted();

  console.log(`\n========================================`);
  console.log(`Monitoring Automation - Daily Workflow`);
  console.log(`Start time: ${timestamp}`);
  console.log(`Date: ${todayDate}`);
  if (dryRun) {
    console.log(`Mode: DRY RUN (no database inserts, no email sends)`);
  }
  console.log(`========================================\n`);

  // Step 1: Verify Supabase connection
  console.log('[1/5] Verifying Supabase connection...');
  const dbHealthy = await healthCheck();
  if (!dbHealthy && !dryRun) {
    console.error('Supabase connection failed. Aborting workflow.');
    return;
  }
  console.log('✅ Supabase connection healthy\n');

  // Step 2: Scrape SolarWeb
  console.log('[2/5] Scraping SolarWeb...');
  const username = process.env.SOLARWEB_USERNAME || '';
  const password = process.env.SOLARWEB_PASSWORD || '';

  if (!username || !password) {
    if (!dryRun) {
      console.error('Missing SolarWeb credentials. Set SOLARWEB_USERNAME and SOLARWEB_PASSWORD.');
      return;
    }
    console.log('[DRY RUN] Credentials check skipped');
  }

  const scraper = new SolarWebScraper(username, password, dryRun);
  const scrapedData = await scraper.run();

  if (!scrapedData) {
    console.error('Scraping failed. Aborting workflow.');
    return;
  }
  console.log(`✅ Scrape successful: ${scrapedData.farm_name}\n`);

  // Step 3: Store in database
  console.log('[3/5] Storing data in Supabase...');
  if (!dryRun) {
    const dbResult = await insertDailyScrape({
      farm_name: scrapedData.farm_name,
      scraped_date: todayDate,
      kwh_produced: scrapedData.kwh_produced,
      kwh_expected: scrapedData.kwh_expected,
      system_status: scrapedData.system_status,
      performance_ratio: scrapedData.performance_ratio,
    });

    if (!dbResult) {
      console.error('Database insert failed. Aborting workflow.');
      return;
    }
    console.log(`✅ Data stored (ID: ${dbResult.id})\n`);
  } else {
    console.log('[DRY RUN] Database insert skipped\n');
  }

  // Step 4: Render email
  console.log('[4/5] Rendering email message...');
  const emailBody = renderDailyTechMessage(scrapedData, todayDate);
  const emailSubject = buildEmailSubject(scrapedData.farm_name, todayDate);
  console.log(`✅ Email rendered\n`);

  // Step 5: Send email
  console.log('[5/5] Sending email...');
  const emailDelivery = createEmailDelivery(dryRun);
  const emailHealthy = await emailDelivery.healthCheck();

  if (!emailHealthy) {
    console.error('Email configuration invalid. Aborting workflow.');
    return;
  }

  const emailSent = await emailDelivery.send({
    subject: emailSubject,
    body: emailBody,
    recipient: process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
    farmName: scrapedData.farm_name,
  });

  if (!emailSent && !dryRun) {
    console.error('Email send failed. Aborting workflow.');
    return;
  }

  if (!dryRun) {
    const emailRecord = await insertDailyEmail({
      farm_name: scrapedData.farm_name,
      email_date: todayDate,
      recipient_email: process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
      subject: emailSubject,
      body: emailBody,
      delivery_status: 'sent',
    });

    if (emailRecord) {
      console.log(`✅ Email sent and recorded (ID: ${emailRecord.id})\n`);
    }
  } else {
    console.log('[DRY RUN] Email send skipped\n');
  }

  console.log(`========================================`);
  console.log(`Workflow completed successfully`);
  console.log(`End time: ${new Date().toISOString()}`);
  console.log(`========================================\n`);
}

/**
 * Entry point: parse CLI arguments and run workflow
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    await runDailyWorkflow(dryRun);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
