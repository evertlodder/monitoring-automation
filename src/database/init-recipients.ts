import { supabase } from './supabase-client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initialize recipient_preferences table and seed with default data
 */
async function initializeRecipients() {
  console.log('Initializing recipient_preferences table...\n');

  try {
    // Create table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.recipient_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        farm_ids TEXT[],
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_recipient_preferences_role
        ON public.recipient_preferences(role);
      CREATE INDEX IF NOT EXISTS idx_recipient_preferences_active
        ON public.recipient_preferences(active);
    `;

    // Execute create table (via RPC or direct SQL)
    let createError: any = null;
    try {
      const result = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (result.error) {
        createError = result.error;
      }
    } catch (err) {
      createError = { message: 'RPC not available, using manual approach' };
    }

    if (createError?.message === 'RPC not available, using manual approach') {
      console.log('Note: Table creation requires manual SQL execution in Supabase dashboard.');
      console.log('Run this SQL in your Supabase SQL Editor:\n');
      console.log(createTableSQL);
      console.log('\n');
    }

    // Seed with management recipients
    const management = [
      {
        role: 'management',
        recipient_name: 'Evert (BV)',
        recipient_email: 'evert@greenspark.co.ke',
        farm_ids: null,
        active: true,
      },
      {
        role: 'management',
        recipient_name: 'Mike (LTD Tech Lead)',
        recipient_email: process.env.MIKE_EMAIL || 'mike.mwangi@greenspark.co.ke',
        farm_ids: null,
        active: true,
      }
    ];

    console.log('Inserting management recipients...');
    for (const recipient of management) {
      const { data, error } = await supabase
        .from('recipient_preferences')
        .insert([recipient])
        .select();

      if (error) {
        if (error.code === '23505') {
          console.log(`✓ ${recipient.recipient_name} already exists`);
        } else {
          console.error(`✗ Error inserting ${recipient.recipient_name}:`, error);
        }
      } else {
        console.log(`✓ Added ${recipient.recipient_name}`);
      }
    }

    console.log('\n✅ Recipients initialized!');
    console.log('\nTo add farm technicians, use this format:');
    console.log(`{
      role: 'technician',
      recipient_name: 'Paul (Kisima)',
      recipient_email: 'paul@...',
      farm_ids: ['kisima'],
      active: true
    }`);

  } catch (error) {
    console.error('Failed to initialize recipients:', error);
    process.exit(1);
  }
}

initializeRecipients();
