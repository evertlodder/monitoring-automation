import { chromium, Browser, Page } from 'playwright';
import { SOLARWEB_URLS, SOLARWEB_SELECTORS, MOCK_SOLARWEB_DATA, parseKwhValue, parseSystemStatus } from './solarweb-selectors.js';

export interface ScraperResult {
  farm_name: string;
  kwh_produced: number;
  kwh_expected: number;
  system_status: string;
  performance_ratio: number;
}

export class SolarWebScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private username: string;
  private password: string;
  private dryRun: boolean;

  constructor(username: string, password: string, dryRun: boolean = false) {
    this.username = username;
    this.password = password;
    this.dryRun = dryRun;
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
      await this.page.goto(SOLARWEB_URLS.LOGIN, { waitUntil: 'networkidle' });

      // Fill in credentials
      console.log('Filling credentials...');
      await this.page.fill('input[name="Email"]', this.username);
      await this.page.fill('input[name="Password"]', this.password);

      // Submit login
      console.log('Submitting login form...');
      await this.page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await this.page.waitForNavigation({ waitUntil: 'networkidle' });

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
      console.log('Navigating to dashboard...');
      await this.page.goto(SOLARWEB_URLS.DASHBOARD, { waitUntil: 'networkidle' });

      // Wait for content to load
      await this.page.waitForTimeout(2000);

      console.log('Extracting farm name...');
      const farmName = await this.extractText(SOLARWEB_SELECTORS.FARM_NAME);

      console.log('Extracting kWh produced...');
      const kwhProducedText = await this.extractText(SOLARWEB_SELECTORS.KWH_PRODUCED);
      const kwhProduced = parseKwhValue(kwhProducedText);

      console.log('Extracting expected production...');
      const kwhExpectedText = await this.extractText(SOLARWEB_SELECTORS.KWH_EXPECTED);
      const kwhExpected = parseKwhValue(kwhExpectedText);

      console.log('Extracting system status...');
      const statusText = await this.extractText(SOLARWEB_SELECTORS.SYSTEM_STATUS);
      const status = parseSystemStatus(statusText);

      console.log('Extracting performance ratio...');
      const ratioText = await this.extractText(SOLARWEB_SELECTORS.PERFORMANCE_RATIO);
      const ratio = parseKwhValue(ratioText);

      if (!kwhProduced || !kwhExpected) {
        console.warn('Could not extract production values - selectors may need updating');
        console.log('Farm name:', farmName);
        console.log('kWh produced text:', kwhProducedText);
        console.log('kWh expected text:', kwhExpectedText);
        return null;
      }

      const result: ScraperResult = {
        farm_name: farmName || 'UNKNOWN',
        kwh_produced: kwhProduced,
        kwh_expected: kwhExpected,
        system_status: status,
        performance_ratio: ratio || 0,
      };

      console.log('Scrape successful:', result);
      return result;
    } catch (error) {
      console.error('Scrape failed:', error);
      return null;
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
