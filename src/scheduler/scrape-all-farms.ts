import dotenv from 'dotenv';
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
 * Scrape all farms in parallel
 */
async function scrapeAllFarms(dryRun: boolean = false): Promise<void> {
  const timestamp = new Date().toISOString();

  console.log(`\n========================================`);
  console.log(`Scraping All Farms - Parallel Mode`);
  console.log(`Start time: ${timestamp}`);
  console.log(`Farms: ${farms.map((f) => f.farmName).join(', ')}`);
  if (dryRun) {
    console.log(`Mode: DRY RUN`);
  }
  console.log(`========================================\n`);

  const startTime = Date.now();

  // Run all farm scrapes in parallel
  const results = await Promise.allSettled(
    farms.map((farm) => {
      console.log(`⏳ Starting scrape for ${farm.farmName}...`);
      return runDailyWorkflow(farm, dryRun);
    })
  );

  // Report results
  const duration = Date.now() - startTime;
  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`\n========================================`);
  console.log(`Scraping Complete`);
  console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`Successful: ${successful}/${farms.length}`);
  if (failed > 0) {
    console.log(`Failed: ${failed}`);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.log(`  ✗ ${farms[index].farmName}: ${result.reason}`);
      }
    });
  }
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    await scrapeAllFarms(dryRun);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
