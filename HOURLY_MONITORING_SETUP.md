# Hourly Monitoring System Setup

## Overview

Complete system for:
- **Hourly scraping** (6 AM - 6 PM East African Time)
- **Data retention** (365-day automatic cleanup)
- **Daily aggregation** (trend analysis & long-term storage)

## Database Size Analysis

**Expected storage per year:**
- 4 farms × 12 hours/day × 365 days = 17,520 scrapes/year
- ~3.5 KB per scrape (including inverter data)
- **Total: ~60-70 MB/year** (negligible!)

**Retention policy:**
- Daily data: Keep 365 days (detailed hourly readings)
- Aggregated data: Keep indefinitely (daily totals for trends)
- Auto-delete: Records older than 365 days

---

## Step 1: Create Supabase Tables

Run this SQL in your Supabase dashboard → SQL Editor:

```sql
-- Create daily aggregated table (for trends/analytics)
CREATE TABLE IF NOT EXISTS public.daily_scrape_aggregated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id TEXT NOT NULL,
  farm_name TEXT NOT NULL,
  scrape_date DATE NOT NULL,

  total_kwh NUMERIC(10, 2),
  avg_kwh_per_hour NUMERIC(10, 2),
  peak_kwh NUMERIC(10, 2),
  systems_count INTEGER,
  systems_producing INTEGER,
  uptime_percent NUMERIC(5, 2),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(farm_id, scrape_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_scrape_aggregated_farm_id
  ON public.daily_scrape_aggregated(farm_id);
CREATE INDEX IF NOT EXISTS idx_daily_scrape_aggregated_date
  ON public.daily_scrape_aggregated(scrape_date);
CREATE INDEX IF NOT EXISTS idx_daily_scrape_aggregated_farm_date
  ON public.daily_scrape_aggregated(farm_id, scrape_date DESC);

-- (Also create recipient_preferences table from SETUP_EMAIL_SYSTEM.md if not done yet)
```

---

## Step 2: Understanding the System

### Hourly Scraper (6 AM - 6 PM EAT)

```bash
npm run scrape:hourly
```

**What it does:**
- Runs every hour (on the hour)
- Scrapes all 4 farms in parallel
- Only active 6 AM - 6 PM East African Time (UTC+3)
- Outside hours: sleeps and waits for next scheduled hour
- Each scrape: ~2-3 minutes for all farms
- Stores data in `daily_scrape` table

**Example output:**
```
[*******]
[HOURLY SCRAPE] 2026-06-09T10:00:00.000Z
[*******]

⏳ [alisha] Starting...
⏳ [ayana] Starting...
⏳ [akina] Starting...
⏳ [bigflowers] Starting...

[HOURLY SCRAPE COMPLETE]
Duration: 2.3s
Successful: 4/4
```

### Daily Aggregation (Midnight)

```bash
npm run data:aggregate
```

**What it does:**
- Runs at midnight (00:00) daily
- Aggregates yesterday's 12 hourly scrapes per farm
- Calculates: total kWh, average, peak, uptime %
- Stores in `daily_scrape_aggregated` table
- Used for trending & long-term analysis

**Data kept:**
- Yesterday's data from all 4 farms
- Example: 2026-06-08, total 831.92 kWh for Alisha

### Daily Cleanup (01:00 AM)

```bash
npm run data:cleanup
```

**What it does:**
- Runs at 1 AM daily
- Deletes records older than 365 days
- Keeps rolling 365-day window of hourly data
- Aggregated data NOT deleted (kept for history)

---

## Step 3: Setup Cron Scheduling

### Option A: Linux/Mac (crontab)

```bash
# Edit crontab
crontab -e

# Add these lines:
# Hourly scraper: runs at :00 of each hour, 6 AM - 6 PM EAT
0 6-17 * * * cd /path/to/monitoring-automation && npm run scrape:hourly >> /var/log/fontana-scrape.log 2>&1

# Daily aggregation: run at midnight (00:00)
0 0 * * * cd /path/to/monitoring-automation && npm run data:aggregate >> /var/log/fontana-aggregate.log 2>&1

# Daily cleanup: run at 1 AM (01:00)
0 1 * * * cd /path/to/monitoring-automation && npm run data:cleanup >> /var/log/fontana-cleanup.log 2>&1

# Daily email generation: run at 12:00 PM (noon) East African Time
# Shows 6 hours of morning production data to identify issues
0 12 * * * cd /path/to/monitoring-automation && npm run email:generate >> /var/log/fontana-email.log 2>&1
```

### Option B: Windows Task Scheduler

1. Open Task Scheduler
2. Create 4 basic tasks:

**Task 1: Hourly Scraper**
- Name: `Fontana-Hourly-Scraper`
- Trigger: Daily, 6:00 AM
- Action: `powershell.exe`
- Arguments: `-NoProfile -Command "cd C:\Users\Evert\monitoring-automation && npm run scrape:hourly"`

Repeat the daily trigger 12 times (6 AM, 7 AM, ... 5 PM)

**Task 2: Daily Aggregation**
- Name: `Fontana-Daily-Aggregation`
- Trigger: Daily, 12:00 AM (Midnight)
- Action: `powershell.exe`
- Arguments: `-NoProfile -Command "cd C:\Users\Evert\monitoring-automation && npm run data:aggregate"`

**Task 3: Daily Cleanup**
- Name: `Fontana-Daily-Cleanup`
- Trigger: Daily, 1:00 AM
- Action: `powershell.exe`
- Arguments: `-NoProfile -Command "cd C:\Users\Evert\monitoring-automation && npm run data:cleanup"`

**Task 4: Daily Email Generation**
- Name: `Fontana-Daily-Email`
- Trigger: Daily, 12:00 PM (Noon) — East African Time
- Action: `powershell.exe`
- Arguments: `-NoProfile -Command "cd C:\Users\Evert\monitoring-automation && npm run email:generate"`
- Description: "Send daily summary of morning production (6 AM - 12 PM) to identify issues early"

### Option C: PM2 (Node.js Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start hourly scraper
pm2 start dist/scheduler/hourly-scraper.js --name "fontana-hourly" --cron "0 * * * *"

# Create ecosystem file for all tasks
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'fontana-hourly',
      script: './dist/scheduler/hourly-scraper.js',
      autorestart: true,
      watch: false,
    },
    {
      name: 'fontana-aggregate',
      script: './dist/scheduler/aggregate-data.js',
      cron_time: '0 0 * * *', // Midnight daily
      autorestart: false,
    },
    {
      name: 'fontana-cleanup',
      script: './dist/scheduler/cleanup-old-data.js',
      cron_time: '0 1 * * *', // 1 AM daily
      autorestart: false,
    },
    {
      name: 'fontana-email',
      script: './dist/scheduler/email-generator.js',
      cron_time: '0 12 * * *', // 12 noon (noon) daily - EAT morning production summary
      autorestart: false,
    },
  ]
};
EOF

# Start all processes
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Step 4: Timezone Configuration

**IMPORTANT**: The hourly scraper is configured for **East African Time (UTC+3)**.

If running on a different timezone server, edit `src/scheduler/hourly-scraper.ts`:

```typescript
// Line ~85: Adjust these values
const eatOffset = 3; // UTC+3 for EAT
const localOffset = new Date().getTimezoneOffset() / -60; // Your server's offset

// Example: Running in Amsterdam (UTC+1)
// eatOffset = 3 (EAT stays UTC+3)
// localOffset = -1 (Amsterdam is UTC+1)
// Adjustment = 3 - (-1) = 4 hours ahead
// So 6 AM EAT = 2 AM Amsterdam time
```

Recalculate and redeploy if needed.

---

## Step 5: Monitor the System

### View Recent Scrapes

```bash
# Check last 10 hourly scrapes
npm run build && node -e "
const { supabase } = require('./dist/database/supabase-client.js');
(async () => {
  const { data } = await supabase
    .from('daily_scrape')
    .select('*')
    .order('scrape_time', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(data, null, 2));
})();
"
```

### View Aggregated Data

```bash
# Check this week's aggregated totals
npm run build && node -e "
const { supabase } = require('./dist/database/supabase-client.js');
(async () => {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_scrape_aggregated')
    .select('*')
    .gte('scrape_date', week)
    .order('scrape_date', { ascending: false });
  console.log(JSON.stringify(data, null, 2));
})();
"
```

---

## Command Reference

| Command | Purpose | Frequency |
|---------|---------|-----------|
| `npm run scrape:hourly` | Scrape all farms (runs every hour 6 AM-6 PM EAT) | Hourly |
| `npm run data:aggregate` | Aggregate yesterday's data for trends | Daily (midnight) |
| `npm run data:cleanup` | Delete data older than 365 days | Daily (1 AM) |
| `npm run email:generate` | Generate & send daily emails (morning summary) | Daily (12 noon EAT) |
| `npm run email:dry-run` | Preview emails without sending | Manual |
| `npm run scrape:all` | Manual: Scrape all 4 farms once | Manual |

---

## Costs & Performance

**Database:**
- Storage: ~70 MB/year (negligible)
- Queries: ~48 hourly scrapes/day (minimal load)
- Retention: 365-day rolling window

**Network:**
- Scraping: ~200 requests/day (4 farms × 12 hours)
- SolarWeb API: ~0.5 MB/day (light)

**Compute:**
- Scraper: ~2 minutes per hour = 24 min/day
- Cleanup/Aggregation: ~1 minute total/day
- Total runtime: ~25 min/day (off-peak)

---

## Troubleshooting

**Hourly scraper not running?**
1. Check that the server time is correct
2. Verify East African Time timezone offset
3. Check cron/scheduler logs

**Data not aggregating?**
1. Verify `daily_scrape_aggregated` table exists
2. Check that hourly scrapes completed
3. Run `npm run data:aggregate` manually to test

**Cleanup deleting too much?**
1. Check the 365-day cutoff date in `cleanup-old-data.ts`
2. Adjust if needed: `365 * 24 * 60 * 60 * 1000` milliseconds
3. Always test with `--dry-run` first (if implemented)

---

## Backup Strategy

Since data is so small, consider:
```bash
# Weekly backup (adds <1MB)
pg_dump -h <host> -U <user> -d <db> -t daily_scrape -t daily_scrape_aggregated > /backup/fontana-$(date +%Y%m%d).sql

# Or via Supabase dashboard: Backups → On-demand backup
```

---

## What's Next

- ✅ Hourly scraping (6 AM - 6 PM EAT)
- ✅ Daily aggregation (midnight)
- ✅ 365-day data retention
- ✅ Email generation (daily)
- 📋 Analytics dashboard (future: Grafana/Metabase on aggregated data)
- 📋 Alert system (if production metrics drop below threshold)
