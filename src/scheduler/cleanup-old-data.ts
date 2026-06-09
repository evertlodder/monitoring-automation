import { supabase } from '../database/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Delete scrape data older than 365 days
 */
async function cleanupOldData() {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 365 days ago
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log(`\n========================================`);
  console.log(`Data Cleanup - Remove Old Records`);
  console.log(`Cutoff date: ${cutoffDateStr} (365+ days old)`);
  console.log(`Current date: ${now.toISOString().split('T')[0]}`);
  console.log(`========================================\n`);

  try {
    // Delete old records from daily_scrape
    const { data: deletedData, error: deleteError, count: deletedCount } = await supabase
      .from('daily_scrape')
      .delete()
      .lt('scrape_date', cutoffDateStr);

    if (deleteError) {
      console.error('❌ Error deleting old data:', deleteError);
      return false;
    }

    console.log(`✅ Successfully deleted records from daily_scrape`);
    console.log(`   Deleted count: ${deletedCount || 'unknown'}`);

    // Optional: Clean up daily_scrape_aggregated if exists
    try {
      const { error: aggError, count: aggCount } = await supabase
        .from('daily_scrape_aggregated')
        .delete()
        .lt('scrape_date', cutoffDateStr);

      if (!aggError) {
        console.log(`✅ Cleaned up aggregated data`);
        console.log(`   Deleted count: ${aggCount || 'unknown'}`);
      }
    } catch (err) {
      // Table may not exist yet, that's fine
      console.log(`ℹ️  Aggregated table not found (expected if not yet created)`);
    }

    console.log(`\n========================================`);
    console.log(`Cleanup Complete`);
    console.log(`========================================\n`);

    return true;
  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
    return false;
  }
}

/**
 * Entry point
 */
async function main() {
  const success = await cleanupOldData();
  process.exit(success ? 0 : 1);
}

main();
