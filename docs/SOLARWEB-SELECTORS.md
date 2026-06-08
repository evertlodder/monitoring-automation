# SolarWeb CSS Selectors Guide

## Overview

The scraper uses CSS selectors to extract daily production metrics from the SolarWeb portal. These selectors must be discovered by manually inspecting the live portal.

**Status:** Phase 1A (placeholders) → Phase 1B (live selectors)

## Discovery Process

### Step 1: Login to SolarWeb

1. Open https://www.solarweb.com
2. Enter your credentials
3. Navigate to the main dashboard

### Step 2: Inspect the Production Value

For each metric you need to scrape:

1. Right-click the value on the page (e.g., the "45.23 kWh" number)
2. Select **"Inspect"** or **"Inspect Element"** (browser developer tools)
3. The HTML will highlight in the Elements inspector
4. Look at the `<div>`, `<span>`, or other element containing the value

### Step 3: Identify the CSS Selector

Common selector patterns:

```css
/* By class */
.dashboard-metric.production
.value-display
.farm-status

/* By data attribute */
[data-testid="daily-production"]
[data-metric="production"]

/* By ID */
#daily-kwh
#system-status

/* Nested selectors */
.dashboard .metrics .production-value
.card-header + .card-body .value
```

Example inspection result:
```html
<div class="dashboard-metrics">
  <div class="metric-item production">
    <span class="metric-value">45.23</span>
    <span class="metric-unit">kWh</span>
  </div>
</div>
```

In this case, the selector would be `.metric-item.production .metric-value` or `.dashboard-metrics .metric-value`.

### Step 4: Update the Code

Edit `src/scraper/solarweb-selectors.ts`:

```typescript
export const SOLARWEB_SELECTORS = {
  KWH_PRODUCED: '.metric-item.production .metric-value',
  // ... other selectors
};
```

### Step 5: Test

Run the scraper to verify:

```bash
npm run dry-run
```

If selectors are correct:
```
[2/5] Scraping SolarWeb...
[DRY RUN] Returning mock data
✅ Scrape successful: FONTANA ALISHA
```

If selectors fail:
```
[2/5] Scraping SolarWeb...
[DRY RUN] Returning mock data
⚠️ Could not extract production values - selectors may need updating
Farm name: (empty)
kWh produced text: (empty)
```

Then go back to the browser and re-inspect.

## Required Selectors

These are the metrics the scraper needs:

### 1. FARM_NAME
**Purpose:** Identify the farm (e.g., "FONTANA ALISHA")

**Where to find:** Usually at the top of the dashboard, in a title or header area.

**Example selector:**
```css
.farm-title
.dashboard-header h1
[data-testid="system-name"]
```

### 2. KWH_PRODUCED
**Purpose:** Daily production in kWh (the main metric)

**Where to find:** Center of dashboard, large prominent number.

**Example selector:**
```css
.production-value
.metric-item.daily .value
[data-metric="daily-production"]
```

**Note:** Text may be "45.23 kWh" — the scraper parses out the number.

### 3. KWH_EXPECTED
**Purpose:** Forecasted or expected production for the day

**Where to find:** Often next to or below the actual production value.

**Example selector:**
```css
.expected-production
.forecast-value
[data-metric="expected"]
```

### 4. SYSTEM_STATUS
**Purpose:** System state (PRODUCING, OFF, ERROR, etc.)

**Where to find:** Status indicator, often a color or icon + text.

**Example selector:**
```css
.system-status
.status-indicator
[data-status]
```

**Text values to expect:** "PRODUCING", "ON", "STANDBY", "ERROR", "NOT PRODUCING", etc.

### 5. PERFORMANCE_RATIO
**Purpose:** Efficiency percentage (actual / expected)

**Where to find:** Often displayed as a percentage or ratio.

**Example selector:**
```css
.performance-ratio
.efficiency-percent
[data-metric="performance"]
```

**Text format:** "86.15%", "86.15", or "86.15 %" — scraper normalizes.

## Testing Your Selectors

### Option 1: Browser Console

Open the browser developer tools (F12) and test selectors:

```javascript
// Test each selector
document.querySelector('.metric-item.production .metric-value').textContent
// Output: "45.23"

document.querySelector('.expected-production').textContent
// Output: "52.50 kWh"

document.querySelector('[data-status]').textContent
// Output: "PRODUCING"
```

If the selector returns a value, it's correct. If it returns `null`, the selector is wrong.

### Option 2: Update and Run

1. Update `src/scraper/solarweb-selectors.ts`
2. Run `npm run dry-run` (for testing selectors with real login, use `npm run dev`)
3. Check console output for extracted values

### Option 3: Add Console Logging

Temporarily modify `src/scraper/playwright-scraper.ts` to print extracted text:

```typescript
const kwhProducedText = await this.extractText(SOLARWEB_SELECTORS.KWH_PRODUCED);
console.log('DEBUG: kwhProducedText =', kwhProducedText); // Add this
const kwhProduced = parseKwhValue(kwhProducedText);
```

Then run:
```bash
npm run dev 2>&1 | grep "DEBUG:"
```

## Common Issues

### Selector Returns Empty String

**Cause:** Element exists but has no text content, or selector is wrong.

**Fix:**
1. Check the selector path in browser console
2. Ensure the element actually contains text
3. Try a parent selector: `.parent-div` instead of `.parent-div .child`

### Selector Returns HTML Tags

**Cause:** Element contains nested HTML, not plain text.

**Example:** `<span class="value"><strong>45</strong>.23</span>`

**Fix:** The scraper should still parse this — check if the parsing function works:

```typescript
parseKwhValue('<strong>45</strong>.23') // Should return 45.23
```

If parsing fails, update `parseKwhValue()` in `solarweb-selectors.ts`.

### Selector is Too Generic

**Problem:** Selector matches multiple elements (e.g., multiple farms on one page).

**Fix:** Make selector more specific:

```css
/* Too generic */
.value

/* Better */
.production-section .metric-value

/* Even better */
.dashboard-main .production-card .value
```

Or use data attributes:
```css
[data-farm-id="fontana-alisha"] [data-metric="daily-production"]
```

## Alternative: XPath Fallback

If CSS selectors don't work, Playwright also supports XPath:

```typescript
const element = await this.page.$('//span[contains(text(), "kWh")]');
const text = await element.textContent();
```

Update `SOLARWEB_SELECTORS` to include XPath patterns (already stubbed as `XPATH_KWH_PRODUCED`).

## Validation Checklist

Before deploying:

- [ ] All 5 selectors updated in `src/scraper/solarweb-selectors.ts`
- [ ] Each selector tested in browser console (F12)
- [ ] Selectors return expected text (not null, not empty)
- [ ] `parseKwhValue()` and `parseSystemStatus()` handle the text format
- [ ] `npm run build` succeeds (TypeScript compiles)
- [ ] `npm test` passes (unit tests)
- [ ] `npm run dry-run` shows mock data (no errors)
- [ ] Ready for live test with `npm run dev`

## Example Session

### Before

```typescript
export const SOLARWEB_SELECTORS = {
  FARM_NAME: '[data-testid="farm-name"]',  // TODO: verify
  KWH_PRODUCED: '[data-metric="daily-production"]',  // TODO: verify
  // ... etc
};
```

### Browser Inspection

1. F12 → right-click "45.23 kWh" → Inspect
2. See: `<span class="metric-value production">45.23</span>`
3. Parent: `<div class="card-metric" data-type="production">`
4. Selector: `.card-metric.production .metric-value` or `[data-type="production"] .metric-value`

### After

```typescript
export const SOLARWEB_SELECTORS = {
  FARM_NAME: '.dashboard-header h1.farm-title',
  KWH_PRODUCED: '[data-type="production"] .metric-value',
  KWH_EXPECTED: '[data-type="forecast"] .metric-value',
  SYSTEM_STATUS: '.status-badge',
  PERFORMANCE_RATIO: '.performance-percent',
};
```

### Verification

```bash
$ npm run build
✓ TypeScript compiled

$ npm test
✓ All tests pass

$ npm run dry-run
[2/5] Scraping SolarWeb...
[DRY RUN] Returning mock data
✅ Scrape successful: FONTANA ALISHA

$ npm run dev
[2/5] Scraping SolarWeb...
Navigating to login page...
Filling credentials...
Submitting login form...
Login successful
Navigating to dashboard...
Extracting farm name...
Extracting kWh produced... ← 45.23 ✓
Extracting expected production... ← 52.50 ✓
Extracting system status... ← PRODUCING ✓
Extracting performance ratio... ← 86.15 ✓
Scrape successful: FONTANA ALISHA
✅ Scrape successful: FONTANA ALISHA
```

---

## Resources

- [MDN: CSS Selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
- [Playwright Selector Guide](https://playwright.dev/docs/selectors)
- [Browser DevTools Inspector](https://developer.chrome.com/docs/devtools/)
- [SolarWeb Portal](https://www.solarweb.com)
