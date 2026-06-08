# Troubleshooting Guide

## Common Issues & Solutions

### Installation Issues

#### "npm install fails with peer dependency errors"

**Error:**
```
npm ERR! peer dep missing: @types/node@*
```

**Solution:**
```bash
npm install --save-dev @types/node typescript
npm install
```

#### "Node version mismatch"

**Solution:**
```bash
node --version  # Should be 18.0.0 or higher
# If not, install Node 18+ from https://nodejs.org
```

---

### Build Issues

#### "TypeScript compilation fails"

**Error:**
```
error TS2307: Cannot find module '@supabase/supabase-js'
```

**Solution:**
```bash
npm install  # Ensure all deps installed
npm run build  # Try again
```

#### "Module not found: playwright"

**Solution:**
```bash
npm install playwright
npm install  # Full reinstall
```

---

### Environment Configuration

#### ".env file not found"

**Error:**
```
Error: ENOENT: no such file or directory, open '.env'
```

**Solution:**
```bash
cp .env.example .env
# Edit .env with your credentials
nano .env  # or use your editor
```

#### "SUPABASE_URL is undefined"

**Error:**
```
Error: Missing Supabase credentials in environment variables
```

**Solution:**
1. Verify `.env` file exists in project root
2. Check contents:
   ```bash
   cat .env | grep SUPABASE
   ```
3. Ensure no quotes around values:
   ```
   SUPABASE_URL=https://project.supabase.co
   SUPABASE_ANON_KEY=key_value_here
   ```
   NOT:
   ```
   SUPABASE_URL="https://project.supabase.co"  # Wrong!
   ```

---

### Database Issues

#### "Supabase connection failed"

**Error during `npm run setup-supabase`:**
```
Error: Failed to connect to Supabase
```

**Diagnosis:**
```bash
# Check if credentials are correct
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connectivity
curl -H "apikey: YOUR_ANON_KEY" \
  https://your-project.supabase.co/rest/v1/daily_scrape?limit=1
# Should return JSON, not error
```

**Solutions:**

1. **Verify URL format:**
   ```
   SUPABASE_URL=https://abc123.supabase.co  # Correct
   SUPABASE_URL=abc123.supabase.co  # Wrong! Missing https://
   ```

2. **Check if tables exist:**
   - Open Supabase dashboard → SQL Editor
   - Run: `SELECT * FROM daily_scrape LIMIT 1;`
   - If error "does not exist", run `npm run setup-supabase` first

3. **Verify API key is enabled:**
   - Open Supabase dashboard → Settings → API
   - Copy the "anon public" key (not the service role key)
   - Update `.env` with correct key

#### "Unique constraint violation on insert"

**Error:**
```
Error: duplicate key value violates unique constraint "unique_daily_scrape"
```

**Cause:** Data for this farm + date already exists in database.

**Solution:**
```bash
# Check existing data
# Open Supabase dashboard → Table Editor
# View daily_scrape table
# Delete duplicate rows if needed

# Or check via CLI:
npm install -g supabase  # if not already installed
supabase db execute -f <(echo "SELECT * FROM daily_scrape WHERE farm_name = 'FONTANA ALISHA';")
```

#### "Connection timeout"

**Error:**
```
Error: Socket timeout during Supabase query
```

**Solutions:**
1. Check internet connection
2. Verify Supabase status at https://status.supabase.com
3. Increase timeout:
   ```typescript
   // In src/database/supabase-client.ts
   const supabase = createClient(url, key, {
     auth: { persistSession: false },
     global: { headers: { 'X-Client-Info': 'monitoring-automation' } }
   });
   ```

---

### Scraper Issues

#### "SolarWeb login fails"

**Error:**
```
[2/5] Scraping SolarWeb...
Login failed: (login page still showing)
```

**Debugging:**

1. **Test credentials manually:**
   ```bash
   # Try logging in manually at https://www.solarweb.com
   # If login fails there, credentials are wrong
   ```

2. **Check `.env` values:**
   ```bash
   echo $SOLARWEB_USERNAME
   echo $SOLARWEB_PASSWORD
   # Ensure no extra spaces or special chars causing issues
   ```

3. **Enable visual debugging:**
   ```typescript
   // In src/scraper/playwright-scraper.ts, line ~25
   // Change:
   this.browser = await chromium.launch({ headless: true });
   // To:
   this.browser = await chromium.launch({ headless: false });
   ```
   Then run: `npm run dev` — you'll see the browser window

4. **Check for account lock:**
   - SolarWeb may lock account after failed login attempts
   - Try logging in manually from your IP address
   - Wait 15 minutes if locked

#### "Selectors not finding elements"

**Error:**
```
[2/5] Scraping SolarWeb...
Extracting kWh produced...
Could not extract production values - selectors may need updating
Farm name: 
kWh produced text: 
```

**Debugging Steps:**

1. **Inspect the live portal:**
   ```
   1. Open https://www.solarweb.com
   2. Login with your credentials
   3. Right-click the daily kWh value
   4. Click "Inspect" (F12 developer tools)
   5. Find the CSS selector (e.g., `.metric-value`)
   ```

2. **Test selectors in browser console:**
   ```javascript
   // F12 → Console tab
   document.querySelector('.metric-value').textContent
   // Should return something like "45.23"
   
   // If null, selector is wrong
   // Try alternative selectors:
   document.querySelector('[data-metric="production"]').textContent
   document.querySelector('.dashboard .production').textContent
   ```

3. **Update the selectors:**
   ```typescript
   // src/scraper/solarweb-selectors.ts
   export const SOLARWEB_SELECTORS = {
     KWH_PRODUCED: '.metric-value',  // Updated!
     // ... etc
   };
   ```

4. **Test again:**
   ```bash
   npm run dry-run
   ```

#### "Browser crashes or hangs"

**Error:**
```
Timeout waiting for page navigation
```

**Solutions:**

1. **Check internet connection** — page load failing
2. **Increase timeout in scraper:**
   ```typescript
   // src/scraper/playwright-scraper.ts
   await this.page.goto(url, { 
     waitUntil: 'networkidle',
     timeout: 60000  // Increase from default 30000
   });
   ```

3. **Check if SolarWeb is down:**
   - Open https://www.solarweb.com manually
   - Try from different network if possible

4. **Check for JavaScript errors on page:**
   - Open browser with `headless: false` (see debugging above)
   - Check browser console for red errors
   - May indicate SolarWeb issue

---

### Email & Delivery Issues

#### "Email configuration invalid"

**Error:**
```
[5/5] Sending email...
Email configuration invalid. Aborting workflow.
```

**Cause:** Invalid recipient email in `.env`

**Solution:**
```bash
# Check .env
grep ZOHO_RECIPIENT_EMAIL .env

# Should be a valid email:
# ZOHO_RECIPIENT_EMAIL=evert@greenspark.co.ke

# Not:
# ZOHO_RECIPIENT_EMAIL=evert@  # Missing domain
# ZOHO_RECIPIENT_EMAIL="evert@greenspark.co.ke"  # Extra quotes
```

#### "Phase 1A: Email sent but not actually delivered"

**Expected behavior in Phase 1A:**
```
[DRY RUN] Email would be sent:
  To: evert@greenspark.co.ke
  Subject: FONTANA ALISHA — Daily Status (08-Jun-2026)
  Body length: 312 chars

--- EMAIL BODY ---
FONTANA ALISHA — Daily Status Report
Date: 2026-06-08
...
--- END EMAIL BODY ---

[Phase 1A] Email delivery stub - Phase 1B will integrate actual Zoho MCP
```

**This is correct** — Phase 1A logs email instead of sending.

**To send actual emails:**
- Wait for Phase 1B
- Or use `npm run dry-run` to verify format is correct

---

### Testing Issues

#### "Tests fail with module errors"

**Error:**
```
Cannot find module 'ts-jest'
```

**Solution:**
```bash
npm install --save-dev ts-jest @types/jest
npm test
```

#### "Tests timeout"

**Error:**
```
Tests timeout after 5000ms
```

**Solution:**
```typescript
// In test file, increase timeout:
jest.setTimeout(10000);
```

#### "Async test not completing"

**Error:**
```
Expected async function to resolve
```

**Solution:**
```typescript
// Ensure test returns promise
it('should send email', async () => {
  const result = await emailDelivery.send(payload);
  expect(result).toBe(true);
});  // ← async keyword important
```

---

### Runtime Issues

#### "Process exits with code 1"

**Error:**
```
npm run dev
...
process.exit(1)
```

**Debugging:**
```bash
# Run with verbose output
npm run dev 2>&1 | tail -20  # Last 20 lines

# Or capture full log:
npm run dev > output.log 2>&1
cat output.log
```

**Common causes:**
- Missing environment variables
- Database connection failure
- Scraper error (check SolarWeb selectors)

#### "Memory leaks or excessive memory usage"

**Symptom:** Process slow or system unresponsive

**Solution:**
```typescript
// Ensure browser is closed after scraping
await this.browser.close();  // In orchestrator.ts

// Check for event listeners:
// Don't attach multiple listeners to same event
page.removeAllListeners();  // If needed
```

#### "Running task stuck / never completes"

**Symptom:**
```bash
npm run dev  # Hangs, no output for 5+ minutes
```

**Solutions:**

1. **Kill the process:**
   ```bash
   # Terminal: Ctrl+C
   # PowerShell: Ctrl+C
   ```

2. **Debug step by step:**
   ```bash
   # Check each step manually:
   node -e "console.log(process.env.SUPABASE_URL)"  # Env loaded?
   npm run build  # TypeScript OK?
   npm test  # Tests pass?
   ```

3. **Check for network hangs:**
   ```bash
   # If stuck on Supabase:
   curl -v https://your-project.supabase.co/rest/v1/daily_scrape?limit=1
   # Should respond within 2-3 seconds
   ```

---

### Performance Issues

#### "Scraper very slow"

**Causes & solutions:**

1. **Slow internet:**
   ```bash
   # Check network:
   ping www.google.com  # Should be < 100ms
   ```

2. **Playwright overhead:**
   - Expected: 10-30 seconds for login + scrape
   - If > 60 seconds, check SolarWeb page load time

3. **Database latency:**
   - Supabase free tier may be slow
   - Check logs: Supabase dashboard → Logs

4. **Optimize timeouts:**
   ```typescript
   // In playwright-scraper.ts
   await this.page.waitForTimeout(500);  // Reduced from 2000
   ```

---

### Windows-Specific Issues

#### "PowerShell: command not recognized"

**Error:**
```
npm : The term 'npm' is not recognized
```

**Solution:**
1. Ensure Node.js is installed
2. Add Node to PATH:
   ```powershell
   $env:PATH += ";C:\Program Files\nodejs"
   npm --version
   ```

#### "File path issues with backslashes"

**Error:**
```
Error: ENOENT: no such file or directory, open 'C:\Users\...\file.ts'
```

**Solution:**
- Use forward slashes in code: `./src/scraper/file.ts`
- Or escape backslashes: `C:\\Users\\...\\file.ts`
- Node.js handles both automatically in most cases

---

## Getting Help

### Information to Provide

When reporting issues, include:

1. **Output of `npm run dry-run`:**
   ```bash
   npm run dry-run 2>&1 | tee debug-output.txt
   cat debug-output.txt  # Share this
   ```

2. **Environment check:**
   ```bash
   node --version
   npm --version
   echo $SUPABASE_URL  # On Windows: Get-Content Env:SUPABASE_URL
   ```

3. **Error message:**
   - Full error text
   - Stack trace if available
   - Last 20-30 lines of output

4. **Steps to reproduce:**
   - Exactly what you ran
   - What you expected
   - What actually happened

### Documentation Links

- [Playwright Troubleshooting](https://playwright.dev/docs/troubleshooting)
- [Supabase JavaScript Docs](https://supabase.com/docs/reference/javascript)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Jest Testing Docs](https://jestjs.io/docs/getting-started)

---

## Quick Reference

| Problem | Command | Notes |
|---------|---------|-------|
| Setup fails | `npm install && npm run build` | Full rebuild |
| Database connection | `npm run setup-supabase` | Verify tables + seed |
| Scraper selectors | `npm run dry-run` | Test with mock data |
| All tests | `npm test` | No external deps |
| Full workflow | `npm run dev` | Requires `.env` + selectors |
| Live browser | Edit `playwright-scraper.ts`: `headless: false` | Visual debugging |
| Clear node_modules | `rm -rf node_modules && npm install` | Fresh install |
| Check TypeScript | `npm run build` | Type errors caught |

---

Last updated: Phase 1A (Development)
