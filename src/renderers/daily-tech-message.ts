import { ScraperResult, Inverter } from '../scraper/playwright-scraper.js';

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
 * Format inverter status as simple ON/OFFLINE
 */
function formatInverterStatus(inverter: Inverter, offlineDays?: number): string {
  if (inverter.kw > 0) {
    return '🟢 ON';
  } else {
    if (offlineDays && offlineDays > 0) {
      return `🔴 OFFLINE (${offlineDays} day${offlineDays > 1 ? 's' : ''} offline)`;
    }
    return '🔴 OFFLINE';
  }
}

/**
 * Format inverter line with simple numbering and status
 */
function formatInverterLine(inverter: Inverter & { offlineDays?: number }, index: number): string {
  const status = formatInverterStatus(inverter, inverter.offlineDays);
  const kwDisplay = inverter.kw > 0 ? `${inverter.kw.toFixed(2)} kW` : '0 kW';
  return `  - Inverter ${index + 1}: ${kwDisplay} [${status}]`;
}

/**
 * Render daily tech message in plain text format
 * Per SOW spec: simple format with status, kWh values, and inverter details
 */
export function renderDailyTechMessage(data: ScraperResult & { allSystems?: any[] }, date: string): string {
  const lines = [
    `FONTANA ALISHA — Daily Status Report`,
    `Date: ${date}`,
    ``,
  ];

  // If multi-system data is available, show each system with inverters
  if (data.allSystems && data.allSystems.length > 0) {
    lines.push(`System Status:`);
    let totalProducing = 0;

    data.allSystems.forEach((system: any) => {
      const indicator = system.status === 'PRODUCING' ? '✅' : '❌';
      lines.push(`${indicator} ${system.name}: ${system.kwh.toFixed(2)} kWh`);

      // Show inverters if available
      if (system.inverters && system.inverters.length > 0) {
        system.inverters.forEach((inverter: Inverter, index: number) => {
          lines.push(formatInverterLine(inverter, index));
        });
      }

      if (system.status === 'PRODUCING') totalProducing++;
      lines.push(``);
    });

    lines.push(`Summary:`);
    lines.push(`Total systems: ${data.allSystems.length}`);
    lines.push(`Producing: ${totalProducing}/${data.allSystems.length}`);
    lines.push(`Total production: ${data.kwh_produced.toFixed(2)} kWh`);
  } else {
    // Fallback for single system
    const statusIndicator = formatStatusIndicator(data.system_status, data.kwh_produced, data.kwh_expected);
    const performancePercent =
      data.kwh_expected > 0 ? Math.round((data.kwh_produced / data.kwh_expected) * 100) : 0;

    lines.push(`System Status:`);
    lines.push(statusIndicator);
    lines.push(``);
    lines.push(`Production:`);
    lines.push(`Today produced: ${data.kwh_produced.toFixed(2)} kWh`);
    lines.push(`Expected: ${data.kwh_expected.toFixed(2)} kWh`);
    lines.push(`Performance: ${performancePercent}%`);
  }

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
