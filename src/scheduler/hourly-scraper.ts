import dotenv from 'dotenv';
import cron from 'node-cron';
import { runDailyWorkflow, FarmConfig } from './orchestrator.js';

dotenv.config();

/**
 * Farm configurations
 */
const farms: FarmConfig[] = [
  {
    farmId: 'alisha',
    farmName: 'Fontana Alisha',
    solarwebUsername: process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  },
  {
    farmId: 'ayana',
    farmName: 'Fontana Ayana',
    solarwebUsername: process.env.AYANA_SOLARWEB_USERNAME || process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.AYANA_SOLARWEB_PASSWORD || process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.AYANA_RECIPIENT_EMAIL || process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  },
  {
    farmId: 'akina',
    farmName: 'Fontana Akina',
    solarwebUsername: process.env.AKINA_SOLARWEB_USERNAME || process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.AKINA_SOLARWEB_PASSWORD || process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.AKINA_RECIPIENT_EMAIL || process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  },
  {
    farmId: 'bigflowers',
    farmName: 'Fontana Big Flowers',
    solarwebUsername: process.env.BIGFLOWERS_SOLARWEB_USERNAME || process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.BIGFLOWERS_SOLARWEB_PASSWORD || process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.BIGFLOWERS_RECIPIENT_EMAIL || process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  },
];

/**
 * Convert EAT (UTC+3) to local timezone for cron scheduling
 *
 * East African Time = UTC+3
 * Scraping hours: 6 AM - 6 PM EAT
 *
 * If running in different timezone, adjust accordingly.
 * Example: Running in Amsterdam (UTC+1), EAT is +2 hours ahead
 * So 6 AM EAT = 4 AM Amsterdam time
 */
function getEATAdjustedHour(): number {
  const now = new Date();
  const eatOffset = 3; // UTC+3
  const localOffset = now.getTimezoneOffset() / -60; // Local timezone offset in hours
  const adjustedHour = new Date().getHours() + (eatOffset - localOffset);
  return adjustedHour % 24;
}

/**
 * Scrape all farms in parallel
 */
async function scrapeAllFarms(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`\n[${'*'.repeat(40)}]`);
  console.log(`[HOURLY SCRAPE] ${timestamp}`);
  console.log(`[${'*'.repeat(40)}]\n`);

  const startTime = Date.now();

  // Run all farm scrapes in parallel
  const results = await Promise.allSettled(
    farms.map((farm) => {
      console.log(`⏳ [${farm.farmId}] Starting...`);
      return runDailyWorkflow(farm, false);
    })
  );

  // Report results
  const duration = Date.now() - startTime;
  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`\n[HOURLY SCRAPE COMPLETE]`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Successful: ${successful}/${farms.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.log(`  ✗ ${farms[index].farmId}: ${result.reason}`);
      }
    });
  }
  console.log();
}

/**
 * Start hourly scheduler
 * Runs every hour from 6 AM to 6 PM East African Time
 */
function startHourlyScheduler() {
  console.log(`\n========================================`);
  console.log(`Hourly Scraper Started`);
  console.log(`Schedule: 6 AM - 6 PM East African Time (UTC+3)`);
  console.log(`Frequency: Every hour (on the hour)`);
  console.log(`========================================\n`);

  // Cron: Run at minute 0 of every hour (00:00, 01:00, 02:00, etc)
  // Note: This runs in server timezone, so adjust if needed
  const task = cron.schedule('0 * * * *', async () => {
    const hour = new Date().getHours();

    // East African Time boundaries (adjust for your local timezone)
    // Example assumes EAT offset of +3 hours
    // If running in Amsterdam (UTC+1), EAT hours are +2 offset from local
    const eatOffset = 3; // Change based on your actual timezone
    const localOffset = new Date().getTimezoneOffset() / -60;
    const adjustedHour = (hour + (eatOffset - localOffset)) % 24;

    // Only scrape between 6 AM and 6 PM EAT
    if (adjustedHour >= 6 && adjustedHour < 18) {
      try {
        await scrapeAllFarms();
      } catch (error) {
        console.error(`[ERROR] Scraping failed:`, error);
      }
    } else {
      console.log(`[SKIP] Outside scraping hours (${adjustedHour}:00 EAT). Resuming at 6 AM.`);
    }
  });

  // Keep the process alive
  console.log(`📅 Scheduler is now running. Press Ctrl+C to stop.\n`);

  // Optional: Run immediately on startup (uncomment if desired)
  // scrapeAllFarms().catch(console.error);

  return task;
}

/**
 * Entry point
 */
async function main() {
  startHourlyScheduler();
}

main().catch(console.error);
