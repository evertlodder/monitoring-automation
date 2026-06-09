# Email Generation System Setup

## Overview
This system uses a two-phase approach:
1. **Scraping Phase**: All 4 farms scrape in parallel → data stored in Supabase
2. **Email Generation Phase**: Read from Supabase → generate & send emails to recipients

## Step 1: Create recipient_preferences Table in Supabase

Go to your Supabase dashboard → SQL Editor and run this SQL:

```sql
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

-- Seed with management tier (optional, can add via app)
INSERT INTO public.recipient_preferences
  (role, recipient_name, recipient_email, farm_ids, active)
VALUES
  ('management', 'Evert (BV)', 'evert@greenspark.co.ke', NULL, true),
  ('management', 'Mike (LTD Tech Lead)', 'mike.mwangi@greenspark.co.ke', NULL, true)
ON CONFLICT DO NOTHING;
```

## Step 2: Add Farm Technicians (Optional)

Add technician recipients via SQL or app. Example:

```sql
INSERT INTO public.recipient_preferences
  (role, recipient_name, recipient_email, farm_ids, active)
VALUES
  ('technician', 'Paul (Kisima)', 'paul@kisima.co.ke', ARRAY['kisima'], true),
  ('technician', 'Tech (Akina)', 'tech@akina.co.ke', ARRAY['akina'], true);
```

**Note**: `farm_ids = NULL` means all farms (use for management tier)

## Step 3: Run the System

### Option A: Manual Run
```bash
# Step 1: Scrape all 4 farms in parallel
npm run build && node dist/scheduler/scrape-all-farms.js

# Step 2: Generate and send emails from Supabase data
npm run build && node dist/scheduler/email-generator.js
```

### Option B: Dry Run (Preview emails without sending)
```bash
node dist/scheduler/email-generator.js --dry-run
```

## Output

**Management recipients see:**
```
FONTANA DAILY OVERVIEW — All Farms & Systems

Farm Summary:
✅ Alisha: 831.92 kWh (3/3 systems)
✅ Ayana: 425.85 kWh (3/3 systems)
✅ Akina: 1,134 kWh (2/2 systems)
✅ Big Flowers: 144.31 kWh (2/2 systems)

TOTAL PRODUCTION: 2,536 kWh
TOTAL SYSTEMS: 11/11 producing

[Detailed view per farm...]
```

**Technician recipients see:**
```
AKINA FARM — Daily Status (09-Jun-2026)

System Status:
✅ dam: 432.08 kWh
✅ roof: 702.17 kWh (4 inverters ON)

Summary:
Total systems: 2
Producing: 2/2
Total production: 1,134 kWh
```

## Automation (Cron)

Add to your cron schedule (e.g., daily at 8 AM):

```bash
# Scrape at 8:00 AM
0 8 * * * cd /path/to/monitoring-automation && npm run build && node dist/scheduler/scrape-all-farms.js

# Generate emails at 8:15 AM (after scraping completes)
15 8 * * * cd /path/to/monitoring-automation && npm run build && node dist/scheduler/email-generator.js
```

## Commands Summary

| Command | Purpose |
|---------|---------|
| `scrape-all-farms.js` | Scrape all 4 farms in parallel, store in Supabase |
| `email-generator.js` | Read from Supabase, generate emails, send to recipients |
| `email-generator.js --dry-run` | Preview emails without sending |
| `orchestrator.js` | Scrape + email single farm (legacy, for manual testing) |

## Notes

- Scraping takes ~2-3 minutes for all 4 farms in parallel
- Email generation is instant (~30 seconds)
- Management recipients get all farms; technicians get assigned farms only
- Each farm's data is stored separately in `daily_scrape` with `farm_id` distinction
