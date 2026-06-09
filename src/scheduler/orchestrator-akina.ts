import dotenv from 'dotenv';
import { runDailyWorkflow, FarmConfig } from './orchestrator.js';

dotenv.config();

/**
 * Akina Farm orchestrator entry point
 * Runs the daily workflow for Fontana Akina Farm
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const akinaConfig: FarmConfig = {
    farmId: 'akina',
    farmName: 'Fontana Akina',
    solarwebUsername: process.env.AKINA_SOLARWEB_USERNAME || process.env.SOLARWEB_USERNAME || '',
    solarwebPassword: process.env.AKINA_SOLARWEB_PASSWORD || process.env.SOLARWEB_PASSWORD || '',
    recipientEmail: process.env.AKINA_RECIPIENT_EMAIL || process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
  };

  try {
    await runDailyWorkflow(akinaConfig, dryRun);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

main();
