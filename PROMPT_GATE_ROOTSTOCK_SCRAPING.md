# Prompt: Fix Gate & Rootstock kWh Scraping

## Problem
The Solarweb scraper successfully extracts real-time kWh data for **Office** (319 kWh), but returns **0 kWh** for Gate and Rootstock systems, even though they actively produce (Gate: 49.5 kW, Rootstock: 30.6 kW per the dashboard).

## Current Behavior
- ✅ Office: 319 kWh (CORRECT - real data)
- ❌ Gate: 0 kWh (WRONG - should be ~49.5 kW production)
- ❌ Rootstock: 0 kWh (WRONG - should be ~30.6 kW production)

## Root Cause
The scraper navigates to individual system pages (`/PvSystems/PvSystem?pvSystemId=<id>`) but the page HTML/text content doesn't render the kWh values. This affects:

1. **pageContent extraction** (line 180-182): `pageContent.match(/(\d+(?:[.,]\d+)?)\s*kWh/i)` returns null
2. **innerText extraction** (fallback): `page.innerText('body')` also returns empty/incomplete text

**Hypothesis**: The pages load but JavaScript/API-driven content (kWh values) renders after the wait timeout, or the navigation redirects to an unexpected page.

## Files to Check
- **Scraper logic**: `C:\Users\Evert\monitoring-automation\src\scraper\playwright-scraper.ts` (lines 150-205)
  - System loop: lines 147-203
  - kWh extraction: lines 173-183
  - Fallback logic: lines 210-215

- **Playwright page setup**: Same file, `login()` method (lines 47-96)
  - Current: `waitUntil: 'load'` → might not wait for JS-rendered content

## Solutions to Try
1. **Better wait strategy**: Use `waitUntil: 'networkidle'` + explicit wait for a specific kWh element
2. **Direct DOM query**: Use Playwright's `locator()` to find the kWh value span/div directly
3. **Network monitoring**: Check browser DevTools to see what API calls load the kWh data
4. **Fallback to dashboard**: Extract Gate/Rootstock kWh from the initial dashboard page instead of navigating

## Reference Data
- Dashboard shows: Gate 49.5 kW, Office 82.7 kW, Rootstock 30.6 kW
- System IDs are stored in `systemIds` array after dashboard scrape
- URLs: `/PvSystems/PvSystem?pvSystemId=<uuid>`

## Success Criteria
- [x] Office returns correct kWh
- [ ] Gate returns ~49.5 kW (not 0)
- [ ] Rootstock returns ~30.6 kW (not 0)
- [ ] Email includes all three systems with real production values

## Related Code
- Email template: `src/renderers/daily-tech-message.ts` (already handles inverters, ready for kWh updates)
- Test command: `npm run build && node dist/scheduler/orchestrator.js`
- Test email sent via Zoho MCP (working)
