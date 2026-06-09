import { chromium, Browser, Page } from 'playwright';
import { SOLARWEB_URLS, SOLARWEB_SELECTORS, MOCK_SOLARWEB_DATA, parseKwhValue, parseSystemStatus } from './solarweb-selectors.js';

export interface Inverter {
  name: string;
  kw: number;
  percentage: number;
  color: 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  status: 'OPTIMAL' | 'UNDERPERFORMING' | 'OFFLINE';
}

export interface SystemData {
  name: string;
  kwh: number;
  status: string;
  inverters?: Inverter[];
}

export interface ScraperResult {
  farm_name: string;
  kwh_produced: number;
  kwh_expected: number;
  system_status: string;
  performance_ratio: number;
  allSystems?: SystemData[];
}

export class SolarWebScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private username: string;
  private password: string;
  private dryRun: boolean;
  private farmNameFilter: string; // Filter for specific farm (e.g., "Fontana Alisha" or "Fontana Ayana")

  constructor(username: string, password: string, dryRun: boolean = false, farmNameFilter: string = 'Fontana Alisha') {
    this.username = username;
    this.password = password;
    this.dryRun = dryRun;
    this.farmNameFilter = farmNameFilter;
  }

  /**
   * Initialize browser connection
   */
  async initialize(): Promise<void> {
    if (this.dryRun) {
      console.log('[DRY RUN] Browser initialization skipped');
      return;
    }

    try {
      this.browser = await chromium.launch({ headless: true });
      this.page = await this.browser.newPage();
      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Login to SolarWeb portal
   */
  async login(): Promise<boolean> {
    if (this.dryRun) {
      console.log('[DRY RUN] Login skipped');
      return true;
    }

    if (!this.page) {
      console.error('Page not initialized');
      return false;
    }

    try {
      console.log('Navigating to login page...');
      await this.page.goto(SOLARWEB_URLS.LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Debug: take screenshot to see what page looks like
      console.log('Debugging: taking screenshot of login page...');
      await this.page.screenshot({ path: 'login-page.png' });
      console.log('Screenshot saved to: login-page.png');

      // Wait longer for form to load
      console.log('Waiting for login form...');
      await this.page.waitForTimeout(2000); // Give page extra time to render

      try {
        await this.page.waitForSelector('input[name="usernameUserInput"]', { timeout: 20000 });
      } catch {
        console.log('usernameUserInput not found, trying data-testid...');
        await this.page.waitForSelector('input[data-testid="login-page-username-input"]', { timeout: 20000 });
      }

      // Fill in credentials
      console.log('Filling credentials...');
      await this.page.fill('input[name="usernameUserInput"]', this.username);
      await this.page.fill('input[name="password"]', this.password);

      // Submit login
      console.log('Submitting login form...');
      await this.page.click('button[type="submit"]');

      // Wait for navigation to complete (to PvSystems/Widgets or Dashboard)
      await this.page.waitForURL(/\/(PvSystems|Dashboard|SolarWebPublic)/, { timeout: 30000 });

      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * Navigate to dashboard and extract daily production data
   */
  async scrapeDaily(): Promise<ScraperResult | null> {
    if (this.dryRun) {
      console.log('[DRY RUN] Returning mock data');
      return MOCK_SOLARWEB_DATA;
    }

    if (!this.page) {
      console.error('Page not initialized');
      return null;
    }

    try {
      // Note: After login, we're already at /PvSystems/Widgets
      // Try to find and click Fontana Alisha system directly
      console.log('Looking for Fontana Alisha Office system...');

      // Wait for page to be interactive
      await this.page.waitForLoadState('networkidle');

      // Debug: take screenshot
      console.log('Debugging: taking screenshot...');
      await this.page.screenshot({ path: 'current-page.png' });
      console.log('Screenshot saved to: current-page.png');

      // Try multiple approaches to find farm systems
      let clicked = false;

      // Extract system IDs from dashboard
      const systemIds = await this.page.$$eval(
        'a[href*="/PvSystems/PvSystem?pvSystemId="]',
        (links, farmFilter) =>
          links
            .map((link) => {
              const href = link.getAttribute('href');
              const match = href?.match(/pvSystemId=([a-f0-9-]+)/);
              const text = (link.textContent || '').trim();
              return match ? { id: match[1], name: text } : null;
            })
            .filter((item) => item && item.name.includes(farmFilter)),
        this.farmNameFilter
      );

      console.log(`Found ${systemIds.length} ${this.farmNameFilter} systems`);

      const allSystems = [];

      // Use all found systems dynamically instead of hardcoded names
      const systemsToProcess = systemIds.filter((s) => s !== null);

      if (systemsToProcess.length === 0) {
        console.log(`No systems found for ${this.farmNameFilter}`);
        return null;
      }

      for (const system of systemsToProcess) {
        // Extract system name from the full text (e.g., "Fontana Ayana Office 180 kW" -> "Office")
        const systemName = system.name
          .replace(this.farmNameFilter, '')
          .replace(/\d+\s*kW/i, '')
          .trim()
          .split('\n')[0]; // Get first line if multiline

        try {
          // Navigate directly to system via URL
          const systemUrl = `/PvSystems/PvSystem?pvSystemId=${system!.id}`;
          console.log(`Navigating to ${systemName}...`);
          await this.page.goto(`${new URL(this.page.url()).origin}${systemUrl}`, { waitUntil: 'networkidle' });

          // Wait for the kWh element to be visible (ensures JS has rendered)
          try {
            await this.page.waitForSelector('span.savings-value.js-savings-value', { timeout: 5000 });
          } catch {
            console.log(`[DEBUG] ${systemName} kWh selector element not found within timeout`);
          }

          // Extract kWh using CSS selector (span.savings-value.js-savings-value)
          let kwhProduced = 0;
          try {
            // Try selector first - discovered 2026-06-08
            const kwhElement = await this.page.locator('span.savings-value.js-savings-value').first();
            const kwhText = (await kwhElement.textContent())?.trim() || '';
            console.log(`[DEBUG] ${systemName} selector found text: "${kwhText}"`);

            if (kwhText) {
              // Text might be just "554.75" or "554.75 kWh", parse directly
              const numberMatch = kwhText.match(/(\d+(?:[.,]\d+)?)/);
              if (numberMatch) {
                const normalized = numberMatch[1].replace(',', '.');
                kwhProduced = parseFloat(normalized) || 0;
              }
            } else {
              // Fallback: try innerText + regex if selector didn't find anything
              console.log(`[DEBUG] ${systemName} selector returned empty, trying regex fallback...`);
              const pageText = await this.page.innerText('body');
              const kwhMatch = pageText.match(/(\d+(?:[.,]\d+)?)\s*kWh/i);
              if (kwhMatch) {
                kwhProduced = parseKwhValue(kwhMatch[0]) || 0;
              }
            }
          } catch (e) {
            console.log(`Error extracting kWh from ${systemName}:`, e);
            kwhProduced = 0;
          }
          console.log(`${systemName}: ${kwhProduced} kWh`);

          // Scrape inverters for this system
          let inverters: Inverter[] = [];
          try {
            inverters = await this.scrapeInverters(system!.id);
            console.log(`[DEBUG] ${systemName} inverters: ${inverters.length} found`);
          } catch (e) {
            console.log(`Error scraping inverters for ${systemName}:`, e);
          }

          allSystems.push({
            name: systemName,
            kwh: kwhProduced,
            status: kwhProduced > 1 ? 'PRODUCING' : 'NOT_PRODUCING',
            inverters: inverters
          });

          clicked = true;
        } catch (e) {
          console.log(`Error scraping ${systemName}:`, e);
        }
      }

      if (clicked && allSystems.length > 0) {
        console.log(`Scraped all ${this.farmNameFilter} systems:`, allSystems);

        // Aggregate data: total kWh, farm status, etc.
        const totalKwh = allSystems.reduce((sum, sys) => sum + sys.kwh, 0);
        const produceCount = allSystems.filter(s => s.status === 'PRODUCING').length;
        const farmStatus = produceCount > 0 ? 'PRODUCING' : 'NOT_PRODUCING';

        // Store multi-system data in a way orchestrator can use
        // For now, return first system as primary, but we'll handle all in renderer
        const result: ScraperResult & { allSystems?: any[] } = {
          farm_name: this.farmNameFilter, // Use the farm name filter (e.g., "Fontana Ayana")
          kwh_produced: totalKwh,
          kwh_expected: 52.50 * allSystems.length, // Expected per system * count
          system_status: farmStatus,
          performance_ratio: 0,
          allSystems: allSystems // Include all systems for renderer
        };

        console.log('Scrape successful - all systems:', result);
        return result;
      } else {
        console.log('Could not scrape systems');
        return null;
      }
    } catch (error) {
      console.error('Scrape failed:', error);
      return null;
    }
  }

  /**
   * Scrape inverters from Realtime page for a given system
   */
  private async scrapeInverters(systemId: string): Promise<Inverter[]> {
    if (!this.page) return [];

    try {
      const realtimeUrl = `/PvSystems/Realtime?pvSystemId=${systemId}`;
      console.log(`Scraping inverters from Realtime page...`);
      await this.page.goto(`${new URL(this.page.url()).origin}${realtimeUrl}`, { waitUntil: 'networkidle' });

      // Wait for inverter data to render
      await this.page.waitForSelector('[class*="power"], [class*="bar"]', { timeout: 10000 }).catch(() => null);
      await this.page.waitForTimeout(3000);

      // Get page text (ignores HTML tags)
      const pageText = await this.page.innerText('body');
      console.log(`[DEBUG] Inverter page text length: ${pageText.length} chars`);

      // Parse inverter data from REALTIME page
      // Format: "Symo 20.0-3-M (1)\n17.240 kW (73%)"
      const inverters: Inverter[] = [];

      // Regex: Symo name -> W or kW value -> percentage (handles newlines/spaces between)
      const inverterPattern = /(Symo\s+[\d\.\-]+[^(]*\(\d+\))\s*[\r\n\s]+([\d\.]+)\s*(?:W|kW)\s*\((\d+)%\)/gs;
      let match;

      while ((match = inverterPattern.exec(pageText)) !== null) {
        const name = match[1].trim();
        let kwValue = parseFloat(match[2]);
        const percentage = parseInt(match[3], 10);

        // If the value is in Watts (< 1), convert to kW
        // Actually, check: if original has "W" not "kW" and value < 100, it's probably watts
        const fullMatch = match[0];
        if (fullMatch.includes(' W ') && !fullMatch.includes('kW') && kwValue < 100) {
          kwValue = kwValue / 1000; // Convert W to kW
        }

        // Determine color/status based on percentage
        let color: 'green' | 'yellow' | 'orange' | 'red' | 'gray' = 'gray';
        let status: 'OPTIMAL' | 'UNDERPERFORMING' | 'OFFLINE' = 'OFFLINE';

        if (kwValue > 0) {
          if (percentage >= 70) {
            color = 'green';
            status = 'OPTIMAL';
          } else if (percentage >= 50) {
            color = 'yellow';
            status = 'UNDERPERFORMING';
          } else if (percentage > 0) {
            color = 'orange';
            status = 'UNDERPERFORMING';
          }
        } else {
          color = 'gray';
          status = 'OFFLINE';
        }

        inverters.push({
          name,
          kw: kwValue,
          percentage,
          color,
          status,
        });
      }

      if (inverters.length === 0) {
        console.log('No inverters found in Realtime data');
        // Debug: show what we're searching in
        const symoIndex = pageText.indexOf('Symo');
        if (symoIndex >= 0) {
          const excerpt = pageText.substring(
            Math.max(0, symoIndex - 50),
            Math.min(pageText.length, symoIndex + 200)
          );
          console.log('[DEBUG] Symo section found:');
          console.log(excerpt);
        } else {
          console.log('[DEBUG] No "Symo" text found in page. Checking for "power" or "inverter"...');
          const powerIndex = pageText.toLowerCase().indexOf('power');
          if (powerIndex >= 0) {
            console.log('[DEBUG] Power section excerpt:');
            console.log(pageText.substring(powerIndex, Math.min(pageText.length, powerIndex + 500)));
          } else {
            console.log('[DEBUG] Full page text length:', pageText.length);
            console.log('[DEBUG] First 500 chars:', pageText.substring(0, 500));
          }
        }
      } else {
        console.log(`Found ${inverters.length} inverters`);
      }

      // For offline inverters, get offline duration from Energy Balance page
      const todayDate = new Date();
      for (let i = 0; i < inverters.length; i++) {
        if (inverters[i].kw === 0) {
          // This inverter is offline, try to get offline duration
          const offlineDays = await this.getOfflineDuration(systemId, i, todayDate);
          if (offlineDays !== undefined) {
            (inverters[i] as any).offlineDays = offlineDays;
          }
        }
      }

      return inverters;
    } catch (error) {
      console.log(`Error scraping inverters:`, error);
      return [];
    }
  }

  /**
   * Get offline duration (in days) for an offline inverter
   * Checks Energy Balance page for "Last update" timestamp
   */
  private async getOfflineDuration(systemId: string, inverterIndex: number, todayDate: Date): Promise<number | undefined> {
    if (!this.page) return undefined;

    try {
      const energyBalanceUrl = `/PvSystems/EnergyBalance?pvSystemId=${systemId}`;
      console.log(`[DEBUG] Checking Energy Balance for offline duration (inverter ${inverterIndex + 1})...`);

      await this.page.goto(`${new URL(this.page.url()).origin}${energyBalanceUrl}`, {
        waitUntil: 'networkidle',
        timeout: 10000
      }).catch(() => null);

      // Get page text
      const pageText = await this.page.innerText('body');

      // Look for "Last update: DD/MM/YYYY" pattern in ENERGY BALANCE TODAY section
      // Pattern: "Last update: 19/03/2026 07:00 AM" or similar
      const lastUpdatePattern = /Last\s+update:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i;
      const match = pageText.match(lastUpdatePattern);

      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        // Parse the offline date
        const offlineDate = new Date(year, month - 1, day); // month is 0-indexed

        // Calculate days difference
        const timeDiff = todayDate.getTime() - offlineDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        console.log(`[DEBUG] Offline since ${day}/${month}/${year}, ${daysDiff} days offline`);
        return daysDiff > 0 ? daysDiff : 0;
      }

      // Debug: show excerpt of page text if no match
      if (pageText.toLowerCase().includes('update')) {
        const updateIndex = pageText.toLowerCase().indexOf('update');
        console.log(`[DEBUG] "update" found at position ${updateIndex}: ${pageText.substring(updateIndex - 50, updateIndex + 100)}`);
      } else {
        console.log(`[DEBUG] No "Last update" found. Page text sample (first 500 chars): ${pageText.substring(0, 500)}`);
      }

      return undefined;
    } catch (error) {
      console.log(`[DEBUG] Could not get offline duration for inverter ${inverterIndex + 1}:`, error);
      return undefined;
    }
  }

  /**
   * Extract text content from an element using CSS selector
   */
  private async extractText(selector: string): Promise<string> {
    if (!this.page) return '';

    try {
      const element = await this.page.$(selector);
      if (!element) {
        console.warn(`Element not found for selector: ${selector}`);
        return '';
      }

      const text = await element.textContent();
      return text?.trim() || '';
    } catch (error) {
      console.warn(`Error extracting text from selector ${selector}:`, error);
      return '';
    }
  }

  /**
   * Close browser connection
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('Browser closed');
    }
  }

  /**
   * Full scrape flow: initialize -> login -> scrape -> close
   */
  async run(): Promise<ScraperResult | null> {
    try {
      await this.initialize();
      const loggedIn = await this.login();

      if (!loggedIn && !this.dryRun) {
        throw new Error('Login failed');
      }

      const result = await this.scrapeDaily();
      await this.close();

      return result;
    } catch (error) {
      console.error('Scraper run failed:', error);
      await this.close();
      return null;
    }
  }
}
