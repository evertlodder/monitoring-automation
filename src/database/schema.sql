-- Create daily_scrape table for storing SolarWeb data
CREATE TABLE IF NOT EXISTS daily_scrape (
  id BIGSERIAL PRIMARY KEY,
  farm_name TEXT NOT NULL,
  scraped_date DATE NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  kwh_produced NUMERIC(10, 2),
  kwh_expected NUMERIC(10, 2),
  system_status TEXT,
  performance_ratio NUMERIC(5, 2),
  raw_html TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_daily_scrape UNIQUE(farm_name, scraped_date)
);

-- Create daily_email table for tracking sent emails
CREATE TABLE IF NOT EXISTS daily_email (
  id BIGSERIAL PRIMARY KEY,
  farm_name TEXT NOT NULL,
  email_date DATE NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  delivery_status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_daily_email UNIQUE(farm_name, email_date, recipient_email)
);

-- Create indexes for common queries
CREATE INDEX idx_daily_scrape_farm_date ON daily_scrape(farm_name, scraped_date DESC);
CREATE INDEX idx_daily_scrape_created_at ON daily_scrape(created_at DESC);
CREATE INDEX idx_daily_email_farm_date ON daily_email(farm_name, email_date DESC);
CREATE INDEX idx_daily_email_delivery_status ON daily_email(delivery_status);

-- Enable Row Level Security (RLS) - optional for Phase 1A
-- ALTER TABLE daily_scrape ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_email ENABLE ROW LEVEL SECURITY;
