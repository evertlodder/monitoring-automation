# Architecture — Monitoring Automation

## High-Level Flow

```
[SolarWeb Portal]
       ↓ (Playwright)
[Scraper] → {farm_name, kwh_produced, kwh_expected, status, ratio}
       ↓
[Database] → daily_scrape table
       ↓
[Renderer] → Plain-text email body
       ↓
[Delivery] → Zoho Mail MCP
       ↓
[Recipient: evert@greenspark.co.ke]
```

## Components

### 1. SolarWeb Scraper

**File:** `src/scraper/playwright-scraper.ts`

**Responsibility:**
- Automate browser login to solarweb.com
- Navigate dashboard
- Extract daily production metrics
- Return structured data or mock (dry-run)

**Key Classes:**
- `SolarWebScraper` — orchestrates Playwright browser

**Key Methods:**
- `initialize()` — launch headless browser
- `login()` — submit credentials, wait for dashboard
- `scrapeDaily()` — extract metrics via CSS selectors
- `run()` — full flow (init → login → scrape → close)

**Inputs:**
- SolarWeb credentials (env vars)
- CSS selectors (hard-coded, to be discovered)
- Dry-run flag (for testing)

**Outputs:**
- `ScraperResult` — typed data structure
- Console logs (for debugging)
- Or mock data (dry-run mode)

**Dependencies:**
- `playwright` — browser automation
- `solarweb-selectors.ts` — CSS paths + parsing logic

**Error Handling:**
- Login failures → log and return null
- Element not found → warn, continue
- Browser crash → caught, connection closed

---

### 2. Supabase Client

**File:** `src/database/supabase-client.ts`

**Responsibility:**
- Manage database connection
- Insert daily scrape records
- Insert email delivery records
- Query historical data
- Health checks

**Key Functions:**
- `insertDailyScrape(data)` — POST daily metrics
- `insertDailyEmail(data)` — POST email record
- `getTodayScrapeByFarm(farm, date)` — GET single record
- `getScrapesByDateRange(...)` — GET historical data
- `healthCheck()` — verify connectivity

**Tables:**
- `daily_scrape` — { id, farm_name, scraped_date, kwh_produced, kwh_expected, system_status, performance_ratio, created_at, updated_at }
- `daily_email` — { id, farm_name, email_date, recipient_email, subject, body, delivery_status, sent_at, created_at }

**Error Handling:**
- Missing env vars → throw early
- Query errors → log and return null
- Unique constraint violations → handled gracefully

**Dependencies:**
- `@supabase/supabase-js` — client SDK
- `dotenv` — environment configuration

---

### 3. Daily Tech Renderer

**File:** `src/renderers/daily-tech-message.ts`

**Responsibility:**
- Convert `ScraperResult` → human-readable plain text
- Format status indicators (✅ PRODUCING / ❌ NOT_PRODUCING)
- Calculate performance percentages
- Build email subject line

**Key Functions:**
- `renderDailyTechMessage(data, date)` — main render function
- `buildEmailSubject(farmName, date)` — format "FARM — Daily Status (DD-MMM-YYYY)"
- `renderMultiFarmSummary(dataList, date)` — aggregate summary (future)

**Output Format:**
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

**Note:** Plain text only — no Markdown, no `**bold**`, no HTML.

**Dependencies:**
- None (pure TS functions)

---

### 4. Zoho Email Delivery

**File:** `src/delivery/zoho-email.ts`

**Responsibility:**
- Prepare email for sending
- Validate recipient configuration
- Phase 1A: Log to console
- Phase 1B: Integrate Zoho Mail MCP tool

**Key Classes:**
- `ZohoEmailDelivery` — encapsulates email logic

**Key Methods:**
- `send(payload)` — send or log (depending on dry-run flag)
- `healthCheck()` — verify recipient email is valid

**Phase 1A Behavior:**
- Dry-run: Log email payload to console
- Non-dry-run: Log that "Phase 1B will integrate MCP"

**Phase 1B Behavior (TODO):**
- Call `mcp__claude_ai_ZOHO_GREENSPARK_LTD__sendEmail`
- Record delivery status in database
- Handle send failures

**Dependencies:**
- `dotenv` — read ZOHO_RECIPIENT_EMAIL
- Phase 1B: Zoho Mail MCP tool

---

### 5. Orchestrator

**File:** `src/scheduler/orchestrator.ts`

**Responsibility:**
- Coordinate end-to-end workflow
- Parse CLI arguments (--dry-run)
- Log progress at each step
- Handle errors gracefully

**Main Function:** `runDailyWorkflow(dryRun)`

**Workflow Steps:**
1. Verify Supabase connection
2. Scrape SolarWeb
3. Insert scraped data into database
4. Render email message
5. Send email (or log in dry-run)

**CLI Usage:**
```bash
npm run dev              # Live mode (requires .env credentials)
npm run dry-run          # Dry-run mode (mock data, no sends)
npm run build && npm start  # Compiled mode
```

**Logging:**
- Structured output with step numbers [1/5], [2/5], etc.
- Status indicators: ✅ success, ❌ error
- Timestamp logging (ISO 8601)
- Date formatting (YYYY-MM-DD for DB, DD-MMM-YYYY for email)

**Error Handling:**
- Step failures → abort workflow with error message
- Logs to console (stdout + stderr)
- Exit code: 0 on success, 1 on error

**Dependencies:**
- All above modules (scraper, database, renderer, delivery)

---

## Data Flow Example

### Scenario: Daily Report for FONTANA ALISHA

**Input:** Environment variables + CLI flag `--dry-run`

**Step 1: Initialize**
```
Environment:
  SOLARWEB_USERNAME=user@example.com
  SOLARWEB_PASSWORD=***
  SUPABASE_URL=https://project.supabase.co
  SUPABASE_ANON_KEY=***
  ZOHO_RECIPIENT_EMAIL=evert@greenspark.co.ke
  DRY_RUN=false
```

**Step 2: Scrape**
```
Browser login → Navigate to SolarWeb dashboard
Extract (via CSS selectors):
  - farm_name: "FONTANA ALISHA"
  - kwh_produced: 45.23
  - kwh_expected: 52.50
  - system_status: "PRODUCING"
  - performance_ratio: 86.15

Return: ScraperResult object
```

**Step 3: Database Insert**
```
INSERT INTO daily_scrape (
  farm_name, scraped_date, kwh_produced, kwh_expected,
  system_status, performance_ratio
) VALUES (
  'FONTANA ALISHA', '2026-06-08', 45.23, 52.50,
  'PRODUCING', 86.15
);

Result: id=123, created_at=2026-06-08T14:30:00Z
```

**Step 4: Render**
```
Input: ScraperResult
Output:
  Subject: "FONTANA ALISHA — Daily Status (08-Jun-2026)"
  Body:
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

**Step 5: Send**
```
Phase 1A (Dry-run or stub):
  Log email payload to console

Phase 1B (With Zoho MCP):
  Call mcp__claude_ai_ZOHO_GREENSPARK_LTD__sendEmail({
    recipient: "evert@greenspark.co.ke",
    subject: "FONTANA ALISHA — Daily Status (08-Jun-2026)",
    body: "..."
  })
  
  INSERT INTO daily_email (...) VALUES (...)
  UPDATE daily_email SET delivery_status='sent', sent_at=NOW()
```

**Output:** Email received at evert@greenspark.co.ke

---

## Testing Strategy

### Unit Tests (Jest)

**Mocked Data Only** — No real Playwright, no real Supabase

1. **Scraper Tests** (`tests/scraper.test.ts`)
   - Parse kWh values (comma, dot, edge cases)
   - Parse system status (case insensitivity, aliases)
   - Dry-run mode returns mock data

2. **Database Tests** (`tests/database.test.ts`)
   - Verify TypeScript interfaces
   - Validate required fields
   - Test enum constraints (delivery_status)

3. **Renderer Tests** (`tests/renderer.test.ts`)
   - Render complete message
   - Status indicators (✅ / ❌)
   - Date formatting
   - Multi-farm summaries

4. **Email Tests** (`tests/email.test.ts`)
   - Valid recipient validation
   - Dry-run payload construction
   - Email format (no Markdown)

**Run:** `npm test`

### Integration Testing (Manual)

**Phase 1A:** Dry-run mode
```bash
npm run dry-run
# Verifies all modules work together
# Uses mock SolarWeb data + mocked Zoho email
# No actual Supabase inserts
```

**Phase 1B:** Live with SolarWeb
```bash
npm run dev
# Real SolarWeb login + scrape
# Real Supabase inserts
# Zoho email MCP integration
```

---

## Configuration & Environment

### .env Variables

```
SOLARWEB_USERNAME       # SolarWeb portal login email
SOLARWEB_PASSWORD       # SolarWeb password
SUPABASE_URL            # https://your-project.supabase.co
SUPABASE_ANON_KEY       # Public API key (safe to expose)
ZOHO_RECIPIENT_EMAIL    # Recipient email (e.g., evert@greenspark.co.ke)
DRY_RUN                 # Optional: default false
LOG_LEVEL               # Optional: default 'info'
```

### CSS Selectors

**File:** `src/scraper/solarweb-selectors.ts`

Placeholder selectors to be discovered:
```typescript
FARM_NAME: '[data-testid="farm-name"]'
KWH_PRODUCED: '[data-metric="daily-production"]'
KWH_EXPECTED: '[data-metric="expected-production"]'
SYSTEM_STATUS: '[data-status]'
PERFORMANCE_RATIO: '[data-metric="performance-ratio"]'
```

**Discovery Process:**
1. Open SolarWeb in browser
2. Right-click metric value → Inspect Element
3. Note the CSS selector path (e.g., `.dashboard-metric.production`)
4. Update `SOLARWEB_SELECTORS` in `solarweb-selectors.ts`
5. Test with `npm run dry-run`

---

## Deployment & Scheduling

### Local Cron (Linux/Mac)

```cron
# Daily at 14:00 EAT (Nairobi time)
0 14 * * * cd /path/to/monitoring-automation && npm run dev >> /var/log/farm-monitor.log 2>&1
```

### Cloud Functions (Future)

- AWS Lambda: `handler.ts` → `runDailyWorkflow()`
- Cloudflare Workers: Cron trigger → `runDailyWorkflow()`
- GitHub Actions: `cron` event → `npm run dev`

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
CMD ["npm", "run", "dev"]
```

---

## Error Handling & Resilience

### Failures by Component

| Component | Failure | Behavior |
|-----------|---------|----------|
| Scraper | Login failed | Abort workflow, log error |
| Scraper | Selector not found | Warn, continue, return null |
| Database | Connection down | Abort workflow early |
| Database | Unique constraint | Warn, continue (data exists) |
| Renderer | Invalid data | Return placeholder message |
| Email | Send failed | Log, record status='failed', continue |

### Logging

- Console output (CLI mode)
- Could integrate: Sentry, Datadog, Papertrail (Phase 2+)

### Monitoring

- Dry-run mode for health checks: `npm run dry-run`
- Supabase dashboard for data verification
- Email delivery logs in `daily_email.delivery_status`

---

## Security Considerations

### Credentials

- ✅ `.env` file (gitignored)
- ✅ Supabase public key (anon) — read-only to authenticated tables
- ✅ SolarWeb password stored locally, not in code
- ✅ Phase 1B: Zoho MCP tool handles auth

### Data

- ✅ Supabase RLS (Row Level Security) — optional, can enable per table
- ✅ Email body stored in database (no PII by default)
- ✅ Timestamps (created_at, updated_at) for audit trail

### Browser Automation

- ✅ Headless mode (no visible window)
- ✅ Timeout protections in Playwright
- ✅ Error handling for unexpected page states

---

## Future Enhancements (Phase 2+)

1. **Multiple Farms**
   - Extend scraper to iterate over farm list
   - Aggregate daily report
   - Send to different recipients per farm

2. **Alerting**
   - Detect production drops
   - Send alerts on failures
   - Email notifications

3. **Dashboard**
   - Web UI to view historical reports
   - Charts + trends
   - Real-time status

4. **Mobile**
   - Push notifications
   - Mobile-friendly email format
   - WhatsApp integration (Twilio)

5. **Advanced Analytics**
   - ML-based anomaly detection
   - Forecasting
   - Predictive maintenance alerts

---

## Runbook — Troubleshooting

### Scraper Issues

**Problem:** "Selectors not finding elements"

**Solution:**
1. Open https://www.solarweb.com in browser
2. Login with your credentials
3. Right-click the daily production value
4. Click "Inspect" → note the CSS path
5. Update `src/scraper/solarweb-selectors.ts`
6. Rerun `npm run dry-run`

**Problem:** "Login fails"

**Solution:**
1. Verify credentials in `.env` are correct
2. Check if account locked (SolarWeb)
3. Check if Playwright browser is launching: add `headless: false` temporarily in `playwright-scraper.ts`
4. Take a screenshot during test to see actual page state

### Database Issues

**Problem:** "Supabase connection failed"

**Solution:**
1. Check `.env` variables are set correctly
2. Verify Supabase URL and key: `curl -H "apikey: YOUR_KEY" https://your-project.supabase.co/rest/v1/daily_scrape`
3. Ensure tables exist: `npm run setup-supabase`

### Email Issues

**Phase 1A:**
- Email output appears in console log during `npm run dry-run`
- Check console for "--- EMAIL BODY ---" section

**Phase 1B:**
- Verify Zoho account is configured
- Check MCP tool logging
- Verify recipient email is correct

---

## References

- [SolarWeb Portal](https://www.solarweb.com)
- [Playwright Documentation](https://playwright.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Jest Testing Framework](https://jestjs.io)
