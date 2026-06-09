import { ScraperResult } from '../scraper/playwright-scraper.js';

/**
 * Management Report: All farms overview
 * Recipient: Evert, Mike (management tier)
 */
export function renderManagementReport(
  allFarmData: Array<ScraperResult & { allSystems?: any[] }>,
  date: string
): string {
  const lines = [
    `FONTANA DAILY OVERVIEW — All Farms & Systems`,
    `Date: ${date}`,
    ``,
  ];

  // Summary section
  const totalKwh = allFarmData.reduce((sum, farm) => sum + (farm.kwh_produced || 0), 0);
  const totalSystems = allFarmData.reduce((sum, farm) => sum + (farm.allSystems?.length || 0), 0);
  const producingSystems = allFarmData.reduce(
    (sum, farm) => sum + (farm.allSystems?.filter((s: any) => s.status === 'PRODUCING').length || 0),
    0
  );

  lines.push(`Farm Summary:`);
  lines.push(``);

  allFarmData.forEach((farm) => {
    const farmTotal = farm.kwh_produced || 0;
    const farmSystems = farm.allSystems?.length || 0;
    const farmProducing = farm.allSystems?.filter((s: any) => s.status === 'PRODUCING').length || 0;
    const indicator = farmProducing === farmSystems && farmSystems > 0 ? '✅' : farmProducing > 0 ? '⚠️' : '❌';

    lines.push(`${indicator} ${farm.farm_name}: ${farmTotal.toFixed(2)} kWh (${farmProducing}/${farmSystems} systems)`);
  });

  lines.push(``);
  lines.push(`TOTAL PRODUCTION: ${totalKwh.toFixed(2)} kWh`);
  lines.push(`TOTAL SYSTEMS: ${producingSystems}/${totalSystems} producing`);

  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Detail section
  lines.push(`DETAILED VIEW:`);
  lines.push(``);

  allFarmData.forEach((farm) => {
    lines.push(`## ${farm.farm_name.toUpperCase()}`);
    lines.push(``);

    if (farm.allSystems && farm.allSystems.length > 0) {
      farm.allSystems.forEach((system: any) => {
        const indicator = system.status === 'PRODUCING' ? '✅' : '❌';
        lines.push(`${indicator} ${system.name}: ${system.kwh?.toFixed(2) || 0} kWh`);

        if (system.inverters && system.inverters.length > 0) {
          const onCount = system.inverters.filter((inv: any) => inv.kw > 0).length;
          const offCount = system.inverters.length - onCount;
          lines.push(`   → ${onCount} inverters ON, ${offCount} offline`);
        }
      });
    }

    lines.push(``);
  });

  return lines.join('\n');
}

/**
 * Build management report email subject
 */
export function buildManagementSubject(date: string): string {
  return `Fontana Daily Overview — All Farms (${date})`;
}
