import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DailyScrape {
  id?: number;
  farm_name: string;
  scraped_date: string; // YYYY-MM-DD
  kwh_produced: number;
  kwh_expected: number;
  system_status: string;
  performance_ratio: number;
  raw_html?: string;
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
