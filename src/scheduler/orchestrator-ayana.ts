import dotenv from 'dotenv';
import { runDailyWorkflow, FarmConfig } from './orchestrator.js';

dotenv.config();

/**
 * Ayana Farm orchestrator entry point
 * Runs the daily workflow for Fontana Ayana Farm
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const ayanaConfig: FarmConfig = {
    farmId: 'ayana',
    farmName: 'Fontana Ayana',
    solarwebUsername: process.env.AYANA_SOLARWEB_USERNAME || process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.AYANA_SOLARWEB_PASSWORD || process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.AYANA_RECIPIENT_EMAIL || process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  };

  try {
    await runDailyWorkflow(ayanaConfig, dryRun);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
