-- Create daily aggregated data table for trends/analytics
CREATE TABLE IF NOT EXISTS public.daily_scrape_aggregated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id TEXT NOT NULL,
  farm_name TEXT NOT NULL,
  scrape_date DATE NOT NULL,

  -- Aggregated metrics
  total_kwh NUMERIC(10, 2),           -- Total kWh produced that day
  avg_kwh_per_hour NUMERIC(10, 2),   -- Average kWh per hourly scrape
  peak_kwh NUMERIC(10, 2),           -- Peak single scrape value
  systems_count INTEGER,              -- Total systems in farm
  systems_producing INTEGER,          -- Systems that produced that day
  uptime_percent NUMERIC(5, 2),      -- Percentage of time producing (0-100)

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(farm_id, scrape_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_scrape_aggregated_farm_id
  ON public.daily_scrape_aggregated(farm_id);
CREATE INDEX IF NOT EXISTS idx_daily_scrape_aggregated_date
  ON public.daily_scrape_aggregated(scrape_date);
CREATE INDEX IF NOT EXISTS idx_daily_scrape_aggregated_farm_date
  ON public.daily_scrape_aggregated(farm_id, scrape_date DESC);

-- Comment
COMMENT ON TABLE public.daily_scrape_aggregated IS
  'Daily aggregated totals for trending and long-term analysis. Keeps 1 year of data.';
