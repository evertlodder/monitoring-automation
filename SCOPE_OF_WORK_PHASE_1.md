# Scope of Work — Phase 1: Daily Tech Message
## Fontana Alisha Monitoring Automation (POC)

**Project:** Monitoring Plus — Daily Tech Alert System  
**Client:** Greenspark Limited (Kenya O&M)  
**Proof of Concept Farm:** Fontana Alisha (3 systems: Office 120kW, Gate 87kW, Rootstock 40kW)  
**Phase:** 1 of 3 (Daily tech message only)  
**Timeline:** 1 week  
**Owner:** Evert Lodder  
**Status:** Ready for Claude Code handoff

---

## Executive Summary

Build automated daily monitoring system that scrapes Fronius SolarWeb portal (solarweb.com), extracts system production data (kWh), and sends simple daily status message to technician. 

**MVP deliverable:** By end of week, tech receives email at 14:30 EAT every day:
```
FONTANA ALISHA — Daily Status (08-Jun-2026)

Office 120kW:    ✅ PRODUCING (627.59 kWh)
Gate 87kW:       ✅ PRODUCING (450.00 kWh)
Rootstock 40kW:  ✅ PRODUCING (2.50 kWh)

Status: All systems normal. No alerts.
```

---

## Objectives

### Primary
1. Automate daily SolarWeb data collection (eliminate manual export/scraping)
2. Normalize scraper output to Supabase (single source of truth)
3. Generate consistent daily tech email (same format every day)
4. Deliver email to technician at 14:30 EAT (afternoon, Kenya time)

### Secondary
1. Prove tech message value before expanding to ops/finance reports (Phase 2-3)
2. Create foundation for Supabase-based reporting (decouple scraper from reporting logic)
3. Establish reliable scheduler pattern on Hermes VPS

---

## Technical Requirements

### Environment
- **Scraper location:** Hermes VPS (`/opt/data/monitoring-automation`)
- **Runtime:** Node.js 18+ (for Playwright + TypeScript)
- **Database:** Supabase (PostgreSQL, pgvector optional)
- **Email service:** Zoho Mail API (evert@greenspark.co.ke sender)
- **Scheduler:** Cron job on Hermes VPS (runs daily 14:00 EAT)
- **Git:** Personal-icm repo (results committed to inbox for AIOS sync)

### Credentials & Secrets
- `SOLARWEB_USERNAME=evert@greenspark.co.ke`
- `SOLARWEB_PASSWORD=[supplied separately in Hermes .env]`
- `SUPABASE_URL=[project URL]`
- `SUPABASE_KEY=[anon key]`
- `ZOHO_MAIL_TOKEN=[OAuth token or API key]`

### Data Source
- **Portal:** solarweb.com (Fronius SolarWeb)
- **Login:** Username + password (browser automation required — no API available)
- **Extraction:** Daily production (kWh) per system
- **Status logic:** If kWh > 1 → PRODUCING, else NOT PRODUCING

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Hermes VPS (24/7)                                                   │
│                                                                     │
│  14:00 EAT (cron job runs daily)                                   │
│      │                                                              │
│      ├─> [Playwright Scraper]                                      │
│      │   • Login: solarweb.com                                     │
│      │   • Navigate: Fontana Alisha systems                        │
│      │   • Extract: kWh per system (CSS selectors)                 │
│      │   • Return: JSON { farm, systems: [{name, kwh, status}] }  │
│      │                                                              │
│      ├─> [Supabase Insert]                                         │
│      │   • Table: daily_scrape                                     │
│      │   • Fields: farm_id, farm_name, system_name, kwh, status   │
│      │   • Timestamp: NOW()                                        │
│      │                                                              │
│      ├─> [Render: Daily Tech Message]                              │
│      │   • Query: TODAY's data from Supabase                       │
│      │   • Template: Simple status list (✅/❌)                     │
│      │   • Output: Plain text email body                           │
│      │                                                              │
│      └─> [Send: Zoho Mail]                                         │
│          • To: evert@greenspark.co.ke                              │
│          • Subject: "FONTANA ALISHA — Daily Status (DD-Mon-YYYY)"  │
│          • Body: Rendered tech message                             │
│          • CC: [optional: Mike Mwangi, Paul, Violet]               │
│                                                                     │
│  15:00 EAT (Optional: health check)                                │
│      │                                                              │
│      └─> Monitor job success/failure                               │
│          • If failed: alert to Evert                               │
│          • Log: To Hermes /var/log/monitoring-automation.log       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Supabase (PostgreSQL)                                               │
│                                                                     │
│  Table: daily_scrape                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ id | farm_id | farm_name | system_name | scrape_date | kwh  │  │
│  │ 1  | alisha  | Fontana Alisha | Office  | 2026-06-08 | 627.59│  │
│  │ 2  | alisha  | Fontana Alisha | Gate    | 2026-06-08 | 450.00│  │
│  │ 3  | alisha  | Fontana Alisha | Rootstock | 2026-06-08 | 2.50 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  (6-month retention; older data archived to Google Drive)          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Deliverables (Phase 1 Only)

### Code
1. **`src/scraper/playwright-scraper.ts`**
   - Login to SolarWeb (credentials from env)
   - Navigate to Fontana Alisha systems list
   - Click each system (Office, Gate, Rootstock)
   - Extract daily kWh value
   - Return structured JSON

2. **`src/database/schema.sql`**
   - Create table: `daily_scrape`
   - Columns: id, farm_id, farm_name, system_name, scrape_date, scrape_time, kwh, status, created_at
   - Indexes: (farm_id, scrape_date), (created_at) for archive cleanup

3. **`src/database/supabase-client.ts`**
   - Insert daily scrape result into Supabase
   - Handle connection + retry logic
   - Error logging

4. **`src/renderers/daily-tech-message.ts`**
   - Query Supabase for TODAY's data (farm_id = 'alisha')
   - Render plain text: 
     ```
     FONTANA ALISHA — Daily Status (DD-Mon-YYYY)
     
     Office 120kW:    ✅ PRODUCING (627.59 kWh)
     Gate 87kW:       ✅ PRODUCING (450.00 kWh)
     Rootstock 40kW:  ❌ NOT PRODUCING (0.00 kWh)
     
     Status: All systems normal / [Alert summary if any]
     ```
   - Handle missing data gracefully

5. **`src/delivery/zoho-email.ts`**
   - Send via Zoho Mail API
   - To: evert@greenspark.co.ke
   - Subject: "FONTANA ALISHA — Daily Status (DD-Mon-YYYY)"
   - Body: Rendered message
   - Handle failed sends + retry

6. **`src/scheduler/orchestrator.ts`**
   - Orchestrates: scrape → insert → render → send
   - Error handling + logging at each step
   - Dry-run mode (flag to test without sending email)

7. **`scripts/windows-task-setup.ps1`** (For future Hermes cron equivalent)
   - Document how cron job is set up on Hermes
   - Timing: 14:00 EAT (= 11:00 UTC)

### Documentation
1. **`README.md`** — Setup, running locally, troubleshooting
2. **`docs/ARCHITECTURE.md`** — This SOW + decision rationale
3. **`docs/SOLARWEB-SELECTORS.md`** — CSS selectors for each data point (discovered during scraper build)
4. **.env.example** — Template for all secrets

### Tests
1. **`tests/scraper.test.ts`**
   - Mock SolarWeb responses
   - Verify kWh extraction
   - Test status logic (kwh > 1)

2. **`tests/database.test.ts`**
   - Insert sample data
   - Query by farm + date
   - Verify schema

3. **`tests/renderers.test.ts`**
   - Render message with sample data
   - Verify format consistency

4. **`tests/email.test.ts`**
   - Dry-run: construct email, don't send
   - Verify subject + body

---

## Detailed Specifications

### 1. Playwright Scraper (`src/scraper/playwright-scraper.ts`)

**Function signature:**
```typescript
async function scrapeFontanaAlisha(): Promise<{
  farm: string;
  farm_id: string;
  scrape_date: string; // YYYY-MM-DD
  scrape_time: string; // HH:MM:SS EAT
  systems: Array<{
    name: string;        // "Office", "Gate", "Rootstock"
    capacity_kw: number; // 120, 87, 40
    kwh: number;         // Daily production
    status: "PRODUCING" | "NOT_PRODUCING";
  }>;
}>
```

**Steps:**
1. Launch browser (Chromium, headless)
2. Navigate to `https://solarweb.com`
3. Wait for login form
4. Enter credentials (from env)
5. Submit
6. Wait for dashboard load
7. For each system name in ["Office", "Gate", "Rootstock"]:
   - Find tegel/link containing system name
   - Click → navigate to detail page
   - Wait for "ENERGY BALANCE TODAY" or "PRODUCTION" section
   - Extract kWh value (CSS selector TBD during build)
   - Determine status: if kwh > 1 → PRODUCING, else NOT_PRODUCING
   - Back to dashboard (or re-navigate)
8. Return structured JSON
9. Error handling: retry 3x on timeout, log failures to console + file

**Error handling:**
- Login fails → throw error, alert Evert
- System not found → log warning, continue
- Network timeout → retry up to 3x
- Scraper hangs → timeout after 2 minutes

---

### 2. Supabase Schema (`src/database/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS daily_scrape (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id VARCHAR(50) NOT NULL,                -- 'alisha', 'kisima', etc
  farm_name VARCHAR(100) NOT NULL,             -- 'Fontana Alisha', 'Kisima Farm'
  system_name VARCHAR(100) NOT NULL,           -- 'Office', 'Gate', 'Rootstock'
  capacity_kw DECIMAL(10, 2),                  -- 120, 87, 40
  scrape_date DATE NOT NULL,                   -- 2026-06-08
  scrape_time TIME NOT NULL,                   -- 14:15:00
  kwh DECIMAL(10, 2) NOT NULL,                 -- 627.59
  status VARCHAR(20),                          -- 'PRODUCING', 'NOT_PRODUCING'
  scraper_notes TEXT,                          -- Error messages if any
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_scrape_farm_date ON daily_scrape(farm_id, scrape_date);
CREATE INDEX idx_daily_scrape_created ON daily_scrape(created_at);
```

---

### 3. Daily Tech Message Template (`src/renderers/daily-tech-message.ts`)

**Input:**
```typescript
{
  farm_name: "Fontana Alisha",
  scrape_date: "2026-06-08",
  systems: [
    { name: "Office", capacity_kw: 120, kwh: 627.59, status: "PRODUCING" },
    { name: "Gate", capacity_kw: 87, kwh: 450.00, status: "PRODUCING" },
    { name: "Rootstock", capacity_kw: 40, kwh: 2.50, status: "PRODUCING" }
  ]
}
```

**Output (plain text email body):**
```
FONTANA ALISHA — Daily Status (08-Jun-2026)

Office 120kW:        ✅ PRODUCING (627.59 kWh)
Gate 87kW:           ✅ PRODUCING (450.00 kWh)
Rootstock 40kW:      ✅ PRODUCING (2.50 kWh)

Summary: All 3 systems producing. No alerts.

Technician action: None required.
Next check: 09-Jun-2026 14:00 EAT

---
Generated: 08-Jun-2026 14:30 EAT
System: Monitoring Plus v1.0
```

**Logic:**
- If kwh > 1 → ✅ PRODUCING
- If kwh ≤ 1 → ❌ NOT PRODUCING (or OFFLINE)
- Count producing systems
- Alert if any system down (e.g., "1/3 systems offline")

---

### 4. Zoho Email Delivery (`src/delivery/zoho-email.ts`)

**Send parameters:**
- **From:** evert@greenspark.co.ke
- **To:** evert@greenspark.co.ke (test phase; Phase 2 will be Mike)
- **CC:** [optional — configure later]
- **Subject:** `FONTANA ALISHA — Daily Status (DD-Mon-YYYY)`
- **Body:** Rendered tech message (plain text, no HTML)
- **Headers:**
  - `X-Monitoring-Farm: alisha`
  - `X-Monitoring-Phase: 1-daily-tech`

**Zoho API:**
- Use OAuth token (configured in env: `ZOHO_MAIL_TOKEN`)
- Endpoint: `https://mail.zoho.com/api/accounts/{accountId}/messages`
- Retry: 3x on failure, exponential backoff

**Error handling:**
- If send fails: log + retry next cycle (don't block scraper)
- If auth token expired: alert Evert to refresh

---

### 5. Orchestrator (`src/scheduler/orchestrator.ts`)

**Flow:**
```typescript
async function runDailyMonitoring() {
  console.log(`[${timestamp}] Starting daily monitoring...`);
  
  try {
    // Step 1: Scrape
    const scrapedData = await scrapeFontanaAlisha();
    console.log(`[${timestamp}] Scraped: ${scrapedData.systems.length} systems`);
    
    // Step 2: Insert to Supabase
    await insertDailyScrapeSupabase(scrapedData);
    console.log(`[${timestamp}] Inserted: ${scrapedData.systems.length} rows`);
    
    // Step 3: Render
    const emailBody = await renderDailyTechMessage(scrapedData);
    console.log(`[${timestamp}] Rendered: email ready`);
    
    // Step 4: Send
    await sendZohoEmail({
      to: "evert@greenspark.co.ke",
      subject: `FONTANA ALISHA — Daily Status (${scrapedData.scrape_date})`,
      body: emailBody
    });
    console.log(`[${timestamp}] Sent: email delivered`);
    
  } catch (error) {
    console.error(`[${timestamp}] ERROR: ${error.message}`);
    // Don't throw — log and exit gracefully
  }
  
  console.log(`[${timestamp}] Daily monitoring complete`);
}
```

**Logging:**
- To: `/var/log/monitoring-automation.log` (Hermes VPS)
- Level: info (success), error (failures)
- Rotation: daily, keep 30 days

---

## Success Criteria (Phase 1)

| Criterion | Pass/Fail |
|-----------|-----------|
| Scraper logs into SolarWeb successfully | ✅ Required |
| Scraper extracts kWh for all 3 systems (Office, Gate, Rootstock) | ✅ Required |
| Data inserted into Supabase daily_scrape table | ✅ Required |
| Email rendered correctly (plain text, status icons) | ✅ Required |
| Email sent to evert@greenspark.co.ke daily at 14:30 EAT | ✅ Required |
| Cron job runs without manual intervention | ✅ Required |
| All tests pass (scraper, DB, renderer, email) | ✅ Required |
| Documentation complete (README, selectors, troubleshooting) | ✅ Required |
| Error logging works (failures captured, Evert alerted) | ✅ Required |

---

## Testing Strategy

### 1. Local Development (Before Hermes Deployment)
```bash
# Setup
npm install
npm run build

# Unit tests
npm run test

# Integration test (dry-run, no email send)
npm run test:scraper --dry-run

# Render test
npm run test:render --sample-data

# Email test (construct, don't send)
npm run test:email --dry-run
```

### 2. Staging on Hermes (Before Production)
```bash
# Deploy to /opt/data/monitoring-automation-staging
# Run cron: 10:00 EAT (test time, not production)
# Verify output in /var/log/monitoring-automation-staging.log
# Check Supabase: does data appear?
# Check email: does Evert receive message?
```

### 3. Production Cutover
```bash
# Deploy to /opt/data/monitoring-automation
# Set cron: 14:00 EAT
# Monitor first 3 days (success rate, email delivery)
# Adjust selectors if SolarWeb layout changes
```

---

## Deployment to Hermes VPS

1. **Clone repo to Hermes:**
   ```bash
   cd /opt/data
   git clone https://github.com/[your-repo]/monitoring-automation.git
   cd monitoring-automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   npm run build
   ```

3. **Set environment variables** (Hermes `.env`):
   ```
   SOLARWEB_USERNAME=evert@greenspark.co.ke
   SOLARWEB_PASSWORD=[password]
   SUPABASE_URL=https://[project].supabase.co
   SUPABASE_KEY=[anon-key]
   ZOHO_MAIL_TOKEN=[oauth-token]
   ```

4. **Create cron job** (Hermes):
   ```bash
   # Add to crontab
   0 14 * * * cd /opt/data/monitoring-automation && npm run daily:monitor >> /var/log/monitoring-automation.log 2>&1
   ```
   (Runs at 14:00 EAT = 11:00 UTC)

5. **Verify:**
   ```bash
   # Test manually
   npm run daily:monitor
   
   # Check log
   tail -f /var/log/monitoring-automation.log
   
   # Check Supabase
   supabase query "SELECT * FROM daily_scrape WHERE scrape_date = TODAY() LIMIT 10"
   ```

---

## Dependencies & Assumptions

### Dependencies
- Node.js 18+
- Playwright (browser automation)
- @supabase/supabase-js (database)
- axios or node-fetch (HTTP)
- dotenv (environment variables)

### Assumptions
- SolarWeb login credentials valid and unchanged
- SolarWeb portal structure stable (CSS selectors may need updates if layout changes)
- Supabase project exists and credentials valid
- Zoho Mail account configured with OAuth
- Hermes VPS has Node.js + npm installed
- Hermes can reach solarweb.com (no firewall blocking)

### Future Phases (NOT in Scope 1)
- Phase 2: Weekly ops dashboard (metrics, trends)
- Phase 3: Monthly financial + quarterly audit reports
- Scaling to all 15 farms (currently: Fontana Alisha only)
- SMS alerts (optional enhancement)
- Google Drive archival (currently: keep 6 months in Supabase)

---

## Timeline (1 Week)

| Day | Task | Owner | Status |
|---|---|---|---|
| Day 1 | Setup Supabase schema + Hermes repo | Claude Code | ⏳ |
| Day 2-3 | Build Playwright scraper + selectors | Claude Code | ⏳ |
| Day 3-4 | Build Supabase + Zoho email integrations | Claude Code | ⏳ |
| Day 4-5 | Build daily tech renderer + orchestrator | Claude Code | ⏳ |
| Day 5-6 | Test locally + on Hermes staging | Claude Code + Evert | ⏳ |
| Day 6-7 | Deploy to production + monitor | Claude Code + Evert | ⏳ |
| Day 7 | Handoff + documentation | Claude Code | ⏳ |

---

## Handoff Instructions for Claude Code

This SOW is ready for immediate handoff. Claude Code should:

1. **Create repo structure** — `C:\Users\Evert\monitoring-automation\` (or wherever preferred)
2. **Implement each component** in order:
   - Scraper (most complex — requires CSS selector discovery)
   - Database + client
   - Renderer
   - Email delivery
   - Orchestrator
3. **Test locally** before deploying to Hermes
4. **Deploy to Hermes** and set up cron job
5. **Monitor first week** — verify daily emails arrive at 14:30 EAT
6. **Document selectors** — store CSS paths for maintenance (SolarWeb may change)

---

## Q&A / Risks

**Q: What if SolarWeb changes its layout?**  
A: CSS selectors in SOLARWEB-SELECTORS.md will need updating. This is expected maintenance (quarterly review recommended).

**Q: What if Supabase is down?**  
A: Scraper completes, but data not persisted. Retry on next run. Email not sent. Hermes logs failure for Evert to investigate.

**Q: What if Zoho API fails?**  
A: Scraper + Supabase succeed. Email fails silently (logged). Retry next cycle. No alert to Evert unless pattern of failures.

**Q: How to expand to all 15 farms?**  
A: Phase 2 work. Modify scraper loop to iterate `farms = ["alisha", "kisima", "bilashaka", ...]` instead of hardcoded Fontana.

---

**Status:** ✅ Ready for Claude Code  
**Next Step:** Hand to Claude Code for implementation  
**Questions?** Contact Evert before starting build
