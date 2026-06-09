/**
 * CSS selectors and extraction patterns for SolarWeb portal
 *
 * TODO: Evert will inspect live SolarWeb portal and update these selectors
 * Use browser developer tools (F12) to find the exact CSS paths
 */

export const SOLARWEB_URLS = {
  LOGIN: 'https://www.solarweb.com/Account/ExternalLogin',
  DASHBOARD: 'https://www.solarweb.com/SolarWebPublic/Dashboard',
};

/**
 * Selector configuration for extracting daily production data
 * These are placeholders and must be verified against the live portal
 */
export const SOLARWEB_SELECTORS = {
  /**
   * Farm identification - update with actual selectors
   * Example: '.farm-name', '#systemName', etc.
   */
  FARM_NAME: '[data-testid="farm-name"]',

  /**
   * Daily kWh produced - the main metric we're scraping
   * Discovered 2026-06-08: span.savings-value.js-savings-value
   * Example HTML: <span class="savings-value js-savings-value">554.75</span>
   */
  KWH_PRODUCED: 'span.savings-value.js-savings-value',

  /**
   * Expected/forecast kWh for the day
   */
  KWH_EXPECTED: '[data-metric="expected-production"]',

  /**
   * System status indicator (e.g., "PRODUCING", "NOT_PRODUCING")
   */
  SYSTEM_STATUS: '[data-status]',

  /**
   * Performance ratio percentage
   */
  PERFORMANCE_RATIO: '[data-metric="performance-ratio"]',

  /**
   * Alternative: if above selectors don't work, try xpath patterns
   */
  XPATH_KWH_PRODUCED: '//span[contains(text(), "kWh")]',
};

/**
 * Parse kWh value from text
 * Example: "2,345 kWh" or "2.45 kWh" -> 2345 or 2.45
 */
export function parseKwhValue(text: string): number | null {
  if (!text) return null;

  // Remove "kWh" and whitespace
  const cleaned = text.replace(/[kWh\s]/gi, '');

  // Handle both comma and dot as decimal separator
  const normalized = cleaned.replace(',', '.');

  const value = parseFloat(normalized);

  return isNaN(value) ? null : value;
}

/**
 * Extract system status from indicator
 */
export function parseSystemStatus(text: string): string {
  const status = text.toUpperCase().trim();

  // Check for NOT_PRODUCING first (to match "NOT_PRODUCING" before "PRODUCING")
  if (status.includes('NOT') || status.includes('OFF') || status.includes('ERROR')) {
    return 'NOT_PRODUCING';
  }

  if (status.includes('PRODUCING') || status.includes('ON') || status.includes('OK')) {
    return 'PRODUCING';
  }

  return status;
}

/**
 * Mock data for testing before live selectors are confirmed
 * This is what the scraper will return during --dry-run mode
 */
export const MOCK_SOLARWEB_DATA = {
  farm_name: 'FONTANA ALISHA',
  kwh_produced: 45.23,
  kwh_expected: 52.50,
  system_status: 'PRODUCING',
  performance_ratio: 86.15,
  allSystems: [
    {
      name: 'Office',
      kwh: 45.23,
      status: 'PRODUCING',
      inverters: [
        { name: 'Symo 20.0-3-M (1)', kw: 16.843, percentage: 71, color: 'green' as const, status: 'OPTIMAL' as const },
        { name: 'Symo 20.0-3-M (2)', kw: 16.867, percentage: 71, color: 'green' as const, status: 'OPTIMAL' as const },
        { name: 'Symo 20.0-3-M (3)', kw: 11.513, percentage: 55, color: 'yellow' as const, status: 'UNDERPERFORMING' as const },
      ],
    },
    {
      name: 'Gate',
      kwh: 0,
      status: 'NOT_PRODUCING',
      inverters: [],
    },
    {
      name: 'Rootstock',
      kwh: 0,
      status: 'NOT_PRODUCING',
      inverters: [],
    },
  ],
};
