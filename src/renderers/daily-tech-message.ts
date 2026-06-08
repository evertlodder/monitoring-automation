import { ScraperResult } from '../scraper/playwright-scraper.js';

/**
 * Format status indicator based on system production
 */
function formatStatusIndicator(status: string, kwhProduced: number, kwhExpected: number): string {
  if (status === 'NOT_PRODUCING' || kwhProduced === 0) {
    return '❌ NOT_PRODUCING';
  }

  // If we produced anything and it's reasonably close to expected
  if (kwhProduced > 0) {
    return '✅ PRODUCING';
  }

  return '❌ NOT_PRODUCING';
}

/**
 * Render daily tech message in plain text format
 * Per SOW spec: simple format with status, kWh values
 */
export function renderDailyTechMessage(data: ScraperResult, date: string): string {
  const statusIndicator = formatStatusIndicator(data.system_status, data.kwh_produced, data.kwh_expected);

  // Performance percentage
  const performancePercent =
    data.kwh_expected > 0 ? Math.round((data.kwh_produced / data.kwh_expected) * 100) : 0;

  const lines = [
    `FONTANA ALISHA — Daily Status Report`,
    `Date: ${date}`,
    ``,
    `System Status:`,
    statusIndicator,
    ``,
    `Production:`,
    `Today produced: ${data.kwh_produced.toFixed(2)} kWh`,
    `Expected: ${data.kwh_expected.toFixed(2)} kWh`,
    `Performance: ${performancePercent}%`,
    ``,
    `Details:`,
    `Performance ratio: ${data.performance_ratio.toFixed(2)}%`,
  ];

  return lines.join('\n');
}

/**
 * Render a multi-farm summary (for future use)
 */
export function renderMultiFarmSummary(dataList: ScraperResult[], date: string): string {
  const lines = [
    `Daily Solar Farm Status Report`,
    `Date: ${date}`,
    ``,
    `Summary:`,
    `Total farms: ${dataList.length}`,
    ``,
  ];

  let totalProduced = 0;
  let totalExpected = 0;
  const producing = dataList.filter((d) => d.system_status === 'PRODUCING').length;

  dataList.forEach((data) => {
    totalProduced += data.kwh_produced;
    totalExpected += data.kwh_expected;

    const indicator = data.system_status === 'PRODUCING' ? '✅' : '❌';
    lines.push(`${indicator} ${data.farm_name}: ${data.kwh_produced.toFixed(2)} kWh`);
  });

  lines.push('');
  lines.push(`Total produced: ${totalProduced.toFixed(2)} kWh`);
  lines.push(`Total expected: ${totalExpected.toFixed(2)} kWh`);
  lines.push(`Farms producing: ${producing}/${dataList.length}`);

  return lines.join('\n');
}

/**
 * Build email subject line
 */
export function buildEmailSubject(farmName: string, date: string): string {
  // Format: "FONTANA ALISHA — Daily Status (08-Jun-2026)"
  const dateParts = date.split('-'); // YYYY-MM-DD
  const year = dateParts[0];
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthAbbr = months[month - 1];

  return `${farmName} — Daily Status (${String(day).padStart(2, '0')}-${monthAbbr}-${year})`;
}
