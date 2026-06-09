import { supabase } from '../database/supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

interface DailyAggregate {
  farm_id: string;
  farm_name: string;
  scrape_date: string;
  total_kwh: number;
  avg_kwh_per_hour: number;
  peak_kwh: number;
  systems_count: number;
  systems_producing: number;
  uptime_percent: number;
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Aggregate yesterday's data (run daily at midnight)
 */
async function aggregateYesterdayData() {
  const yesterdayDate = getYesterdayDate();
  const now = new Date();

  console.log(`\n========================================`);
  console.log(`Data Aggregation - Daily Totals`);
  console.log(`Aggregating date: ${yesterdayDate}`);
  console.log(`Run time: ${now.toISOString()}`);
  console.log(`========================================\n`);

  try {
    // Get all farms' data for yesterday
    const { data: rawData, error: fetchError } = await supabase
      .from('daily_scrape')
      .select('*')
      .eq('scrape_date', yesterdayDate);

    if (fetchError) {
      console.error('❌ Error fetching data:', fetchError);
      return false;
    }

    if (!rawData || rawData.length === 0) {
      console.log(`ℹ️  No scrape data found for ${yesterdayDate}`);
      return true;
    }

    console.log(`Found ${rawData.length} scrape records for ${yesterdayDate}\n`);

    // Group by farm and aggregate
    const farmAggregates = new Map<string, DailyAggregate>();

    rawData.forEach((record: any) => {
      const key = record.farm_id;

      if (!farmAggregates.has(key)) {
        farmAggregates.set(key, {
          farm_id: record.farm_id,
          farm_name: record.farm_name,
          scrape_date: yesterdayDate,
          total_kwh: 0,
          avg_kwh_per_hour: 0,
          peak_kwh: 0,
          systems_count: 0,
          systems_producing: 0,
          uptime_percent: 0,
        });
      }

      const agg = farmAggregates.get(key)!;
      agg.total_kwh += record.kwh || 0;
      agg.peak_kwh = Math.max(agg.peak_kwh, record.kwh || 0);
    });

    // Calculate averages
    farmAggregates.forEach((agg) => {
      const hoursScraped = rawData.filter((r: any) => r.farm_id === agg.farm_id).length;
      agg.avg_kwh_per_hour = hoursScraped > 0 ? agg.total_kwh / hoursScraped : 0;
      agg.uptime_percent = 100; // Placeholder: calculate based on offline inverters if needed
    });

    // Insert aggregated data
    const aggregates = Array.from(farmAggregates.values());

    console.log(`Aggregating ${aggregates.length} farms:`);
    aggregates.forEach((agg) => {
      console.log(`  ✓ ${agg.farm_name}: ${agg.total_kwh.toFixed(2)} kWh`);
    });

    const { error: insertError } = await supabase
      .from('daily_scrape_aggregated')
      .insert(aggregates)
      .select();

    if (insertError) {
      console.error('❌ Error inserting aggregated data:', insertError);
      return false;
    }

    console.log(`\n✅ Successfully aggregated ${aggregates.length} farm records`);
    console.log(`\n========================================`);
    console.log(`Aggregation Complete`);
    console.log(`========================================\n`);

    return true;
  } catch (error) {
    console.error('❌ Unexpected error during aggregation:', error);
    return false;
  }
}

/**
 * Entry point
 */
async function main() {
  const success = await aggregateYesterdayData();
  process.exit(success ? 0 : 1);
}

main();
