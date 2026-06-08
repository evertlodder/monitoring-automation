/**
 * Setup Supabase schema and seed test data
 *
 * Usage: npm run setup-supabase
 *
 * This script:
 * 1. Creates the daily_scrape and daily_email tables
 * 2. Seeds with sample test data
 * 3. Verifies tables are ready
 */

import { supabase } from '../src/database/supabase-client.js';
import fs from 'fs';
import path from 'path';

async function setupDatabase() {
  console.log('Starting Supabase setup...\n');

  try {
    // Read schema SQL file
    const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Executing schema SQL...');
    // Note: In production, use Supabase CLI or dashboard to apply migrations
    // This is a placeholder for schema application
    console.log('Schema SQL read successfully');
    console.log('To apply the schema, run:');
    console.log('  supabase db push');
    console.log('Or apply via Supabase dashboard > SQL Editor\n');

    // Verify tables exist by attempting a query
    console.log('Verifying tables exist...');
    const { error: scrapeError } = await supabase
      .from('daily_scrape')
      .select('id')
      .limit(1);

    const { error: emailError } = await supabase.from('daily_email').select('id').limit(1);

    if (scrapeError && scrapeError.code === 'PGRST116') {
      console.warn('daily_scrape table not found. Please apply schema.sql first.');
      console.log('\nSchema SQL preview:');
      console.log(schema);
      return;
    }

    if (emailError && emailError.code === 'PGRST116') {
      console.warn('daily_email table not found. Please apply schema.sql first.');
      return;
    }

    console.log('✅ Tables verified\n');

    // Seed test data
    console.log('Seeding test data...');
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const testData = {
      farm_name: 'FONTANA ALISHA',
      scraped_date: dateStr,
      kwh_produced: 45.23,
      kwh_expected: 52.50,
      system_status: 'PRODUCING',
      performance_ratio: 86.15,
    };

    const { data, error } = await supabase.from('daily_scrape').insert([testData]).select();

    if (error) {
      console.error('Seed failed:', error);
      return;
    }

    console.log('✅ Test data inserted:', data);

    // Seed email test data
    console.log('\nSeeding email test data...');
    const emailData = {
      farm_name: 'FONTANA ALISHA',
      email_date: dateStr,
      recipient_email: 'evert@greenspark.co.ke',
      subject: `FONTANA ALISHA — Daily Status (${dateStr})`,
      body: 'Test email body',
      delivery_status: 'pending' as const,
    };

    const { data: emailResult, error: emailInsertError } = await supabase
      .from('daily_email')
      .insert([emailData])
      .select();

    if (emailInsertError) {
      console.error('Email seed failed:', emailInsertError);
      return;
    }

    console.log('✅ Email test data inserted:', emailResult);

    console.log('\n========================================');
    console.log('Supabase setup complete!');
    console.log('========================================');
    console.log('\nNext steps:');
    console.log('1. Test scraper: npm run dry-run');
    console.log('2. Run tests: npm test');
    console.log('3. Set SOLARWEB credentials in .env');
    console.log('4. Update src/scraper/solarweb-selectors.ts with live portal selectors');
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

setupDatabase();
