# Monitoring Automation

Solar farm monitoring system with daily email reports via SolarWeb scraping and Supabase storage.

## Project Structure

```
src/
├── scraper/          # SolarWeb data extraction (Playwright)
├── database/         # Supabase integration
├── renderers/        # Email message formatting
├── delivery/         # Email sending (Zoho Mail MCP)
└── scheduler/        # Orchestration + workflow

tests/               # Unit tests (Jest + mocked data)

docs/                # Documentation
scripts/             # Setup and utilities
```

## Setup

### Prerequisites

- Node.js 18+ (with npm)
- Supabase project (free tier OK)
- SolarWeb credentials
- Zoho Mail account configured

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/monitoring-automation.git
   cd monitoring-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. Set up Supabase:
   ```bash
   npm run setup-supabase
   ```

## Configuration

### Environment Variables

Create `.env` file with:

```env
# SolarWeb
SOLARWEB_USERNAME=your_email@example.com
SOLARWEB_PASSWORD=your_password

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Zoho Mail
ZOHO_RECIPIENT_EMAIL=evert@greenspark.co.ke

# Optional
DRY_RUN=false
LOG_LEVEL=info
```

### SolarWeb Selectors

The CSS selectors for extracting data from the SolarWeb portal are in `src/scraper/solarweb-selectors.ts`.

**Phase 1A Note:** These are placeholders. You'll need to:

1. Open the SolarWeb dashboard in your browser
2. Right-click the kWh production value
3. Click "Inspect" (Developer Tools)
4. Note the CSS selector path
5. Update `solarweb-selectors.ts` with the actual path

Example workflow:
```bash
# 1. Open browser to https://www.solarweb.com
# 2. Inspect the "Daily Production" value
# 3. Copy the CSS selector (e.g., `.dashboard-metric.production`)
# 4. Update src/scraper/solarweb-selectors.ts
```

## Running

### Dry-Run Mode (No Live Scraping)

Test the full workflow with mock data:

```bash
npm run dry-run
```

Output:
```
========================================
Monitoring Automation - Daily Workflow
Start time: 2026-06-08T14:30:00.000Z
Date: 2026-06-08
Mode: DRY RUN (no database inserts, no email sends)
========================================

[1/5] Verifying Supabase connection...
✅ Supabase connection healthy

[2/5] Scraping SolarWeb...
[DRY RUN] Browser initialization skipped
[DRY RUN] Returning mock data
✅ Scrape successful: FONTANA ALISHA

[3/5] Storing data in Supabase...
[DRY RUN] Database insert skipped

[4/5] Rendering email message...
✅ Email rendered

[5/5] Sending email...
✅ Email would be sent

---
FONTANA ALISHA — Daily Status Report
Date: 2026-06-08
Status: ✅ PRODUCING
...
```

### Live Mode (Requires Supabase + SolarWeb)

After configuring `.env` and CSS selectors:

```bash
npm run dev
```

Or as scheduled task (cron):

```bash
# Daily at 14:00 EAT (Nairobi)
0 14 * * * cd /path/to/monitoring-automation && npm run dev
```

### Build

```bash
npm run build
# Generates dist/ folder
```

### Testing

```bash
npm test
```

Runs Jest tests with mocked data (no external dependencies required).

## Architecture

### 1. Scraper (`src/scraper/`)

**Playwright-based SolarWeb browser automation**

- Login to solarweb.com
- Navigate dashboard
- Extract kWh metrics via CSS selectors
- Return structured `ScraperResult`

In dry-run mode, returns mock data without browser initialization.

### 2. Database (`src/database/`)

**Supabase PostgreSQL tables**

**daily_scrape table:**
- `farm_name` — unique identifier
- `scraped_date` — YYYY-MM-DD
- `kwh_produced` — numeric(10,2)
- `kwh_expected` — numeric(10,2)
- `system_status` — 'PRODUCING' | 'NOT_PRODUCING'
- `performance_ratio` — numeric(5,2)

**daily_email table:**
- `farm_name`
- `email_date`
- `recipient_email`
- `subject` and `body` (full message)
- `delivery_status` — 'pending' | 'sent' | 'failed'

### 3. Renderer (`src/renderers/`)

**Plain-text email message formatting**

Converts `ScraperResult` → human-readable email:

```
FONTANA ALISHA — Daily Status Report
Date: 2026-06-08

System Status:
✅ PRODUCING

Production:
Today produced: 45.23 kWh
Expected: 52.50 kWh
Performance: 86%

Details:
Performance ratio: 86.15%
```

### 4. Delivery (`src/delivery/`)

**Zoho Mail MCP integration**

Phase 1A: Stub (logs to console)  
Phase 1B: Integrates with `mcp__claude_ai_ZOHO_GREENSPARK_LTD__sendEmail`

### 5. Orchestrator (`src/scheduler/`)

**Main workflow**

Coordinates:
1. Supabase health check
2. Scrape SolarWeb
3. Insert data into Supabase
4. Render email
5. Send via Zoho Mail
6. Record delivery status

CLI flag: `--dry-run` skips steps 2, 3, 5 (uses mock data, no sends).

## Troubleshooting

### "Supabase connection failed"

1. Check `.env` variables:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

2. Verify tables exist:
   ```bash
   supabase db list
   ```

3. Run setup again:
   ```bash
   npm run setup-supabase
   ```

### "Selectors not finding elements"

1. Open SolarWeb in browser
2. Right-click production value → Inspect
3. Note the actual selector path (e.g., `#dashboard-metrics .production-value`)
4. Update `src/scraper/solarweb-selectors.ts`
5. Test with:
   ```bash
   npm run dry-run
   ```

### "Email not sending"

Phase 1A: Email delivery is stubbed.  
Phase 1B: Integrate Zoho Mail MCP tool to send actual messages.

For now, check dry-run output:
```bash
npm run dry-run 2>&1 | grep -A 20 "EMAIL BODY"
```

### Tests failing

Ensure TypeScript compiles:

```bash
npm run build
npm test
```

If Jest fails with module errors:
```bash
npm install --save-dev ts-jest @types/jest
npm test
```

## Next Steps (Phase 1B)

1. **Live Scraper Test**
   - Evert inspects SolarWeb portal
   - Updates CSS selectors
   - Runs `npm run dev` with real credentials

2. **Zoho Email Integration**
   - Replace `src/delivery/zoho-email.ts` stub with actual MCP tool call
   - Test send to `evert@greenspark.co.ke`

3. **Scheduling**
   - Set cron job for daily 14:00 EAT (Nairobi)
   - Or deploy to cloud function (AWS Lambda, Cloudflare Worker, etc.)

4. **Production Hardening**
   - Error alerts (email on scrape failure)
   - Retry logic for transient failures
   - Logging + monitoring (Sentry, Datadog)
   - Database backups

## Development

### Local TypeScript

```bash
# Watch mode
npx tsc --watch

# Build
npm run build

# Run compiled JS
node dist/scheduler/orchestrator.js
```

### Database Migrations

```bash
# Via Supabase CLI
supabase db push

# Or manual SQL in dashboard
# Copy-paste src/database/schema.sql into SQL Editor
```

## License

Proprietary — Greenspark BV
