import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

// Enable ws transport for Supabase Realtime in Node.js
(global as any).WebSocket = WebSocket;

// Configure Supabase with realtime support
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
});

export interface DailyScrape {
  id?: string;
  farm_id?: string;
  farm_name: string;
  system_name?: string;
  capacity_kw?: number;
  scrape_date: string; // YYYY-MM-DD
  scrape_time?: string;
  kwh: number; // Daily production in kWh
  kwh_expected?: number;
  status?: string;
  scraper_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DailyEmail {
  id?: number;
  farm_name: string;
  email_date: string; // YYYY-MM-DD
  recipient_email: string;
  subject: string;
  body: string;
  delivery_status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  created_at?: string;
}

/**
 * Insert a new daily scrape record
 */
export async function insertDailyScrape(data: DailyScrape): Promise<DailyScrape | null> {
  const { data: result, error } = await supabase
    .from('daily_scrape')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Failed to insert daily_scrape:', error);
    return null;
  }

  return result;
}

/**
 * Get today's scrape data for a specific farm
 */
export async function getTodayScrapeByFarm(farmName: string, date: string): Promise<DailyScrape | null> {
  const { data, error } = await supabase
    .from('daily_scrape')
    .select('*')
    .eq('farm_name', farmName)
    .eq('scraped_date', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('Failed to query daily_scrape:', error);
  }

  return data || null;
}

/**
 * Insert a daily email record
 */
export async function insertDailyEmail(data: DailyEmail): Promise<DailyEmail | null> {
  const { data: result, error } = await supabase
    .from('daily_email')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Failed to insert daily_email:', error);
    return null;
  }

  return result;
}

/**
 * Update email delivery status
 */
export async function updateEmailStatus(
  id: number,
  status: 'sent' | 'failed',
  sentAt?: string
): Promise<void> {
  const { error } = await supabase
    .from('daily_email')
    .update({ delivery_status: status, sent_at: sentAt || new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to update email status:', error);
  }
}

/**
 * Get all scrapes for a date range
 */
export async function getScrapesByDateRange(
  farmName: string,
  startDate: string,
  endDate: string
): Promise<DailyScrape[]> {
  const { data, error } = await supabase
    .from('daily_scrape')
    .select('*')
    .eq('farm_name', farmName)
    .gte('scraped_date', startDate)
    .lte('scraped_date', endDate)
    .order('scraped_date', { ascending: false });

  if (error) {
    console.error('Failed to query date range:', error);
    return [];
  }

  return data || [];
}

/**
 * Get today's scrape data for all farms
 */
export async function getTodayAllFarms(date: string): Promise<DailyScrape[]> {
  const { data, error } = await supabase
    .from('daily_scrape')
    .select('*')
    .eq('scrape_date', date)
    .order('farm_id', { ascending: true });

  if (error) {
    console.error('Failed to query all farms for date:', error);
    return [];
  }

  return data || [];
}

/**
 * Recipient interface
 */
export interface RecipientPreference {
  id: string;
  role: 'management' | 'technician';
  recipient_name: string;
  recipient_email: string;
  farm_ids?: string[] | null;
  active: boolean;
}

/**
 * Get all active recipients
 */
export async function getActiveRecipients(): Promise<RecipientPreference[]> {
  const { data, error } = await supabase
    .from('recipient_preferences')
    .select('*')
    .eq('active', true)
    .order('role', { ascending: true })
    .order('recipient_name', { ascending: true });

  if (error) {
    console.error('Failed to query recipients:', error);
    return [];
  }

  return data || [];
}

/**
 * Get recipients by role
 */
export async function getRecipientsByRole(role: 'management' | 'technician'): Promise<RecipientPreference[]> {
  const { data, error } = await supabase
    .from('recipient_preferences')
    .select('*')
    .eq('role', role)
    .eq('active', true)
    .order('recipient_name', { ascending: true });

  if (error) {
    console.error('Failed to query recipients by role:', error);
    return [];
  }

  return data || [];
}

/**
 * Health check: verify Supabase connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('daily_scrape')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Unexpected error during health check:', err);
    return false;
  }
}
