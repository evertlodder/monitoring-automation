import dotenv from 'dotenv';
import { runDailyWorkflow, FarmConfig } from './orchestrator.js';

dotenv.config();

/**
 * Big Flowers Farm orchestrator entry point
 * Runs the daily workflow for Fontana Big Flowers Farm
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const bigflowersConfig: FarmConfig = {
    farmId: 'bigflowers',
    farmName: 'Fontana Big Flowers',
    solarwebUsername: process.env.BIGFLOWERS_SOLARWEB_USERNAME || process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.BIGFLOWERS_SOLARWEB_PASSWORD || process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.BIGFLOWERS_RECIPIENT_EMAIL || process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  };

  try {
    await runDailyWorkflow(bigflowersConfig, dryRun);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
