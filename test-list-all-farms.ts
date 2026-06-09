import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function listAllFarms() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login
    console.log('Logging in...');
    await page.goto('https://www.solarweb.com/Account/ExternalLogin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('input[name="usernameUserInput"]', process.env.SOLARWEB_USERNAME!);
    await page.fill('input[name="password"]', process.env.SOLARWEB_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(PvSystems|Dashboard)/, { timeout: 30000 });

    console.log('✅ Logged in. Listing all farms...\n');

    // Get all systems
    await page.waitForLoadState('networkidle');

    const allSystems = await page.$$eval(
      'a[href*="/PvSystems/PvSystem?pvSystemId="]',
      (links) =>
        links
          .map((link) => {
            const href = link.getAttribute('href');
            const match = href?.match(/pvSystemId=([a-f0-9-]+)/);
            const text = (link.textContent || '').trim();
            return match ? { id: match[1], name: text } : null;
          })
          .filter((item) => item !== null)
    );

    console.log(`Found ${allSystems.length} systems:\n`);
    allSystems.forEach((sys, i) => {
      console.log(`${i + 1}. ${sys!.name}`);
    });

    console.log('\n=== Grouped by farm ===\n');

    const farms = new Map<string, any[]>();
    allSystems.forEach((sys) => {
      const name = sys!.name;
      // Extract farm name (everything before the last space + kW)
      const farmMatch = name.match(/(Fontana \w+)/);
      if (farmMatch) {
        const farmName = farmMatch[1];
        if (!farms.has(farmName)) {
          farms.set(farmName, []);
        }
        farms.get(farmName)!.push(sys);
      }
    });

    farms.forEach((systems, farmName) => {
      console.log(`${farmName}:`);
      systems.forEach((sys) => {
        const systemName = sys.name.replace(farmName, '').replace(/\d+\s*kW/i, '').trim();
        console.log(`  - ${systemName}`);
      });
      console.log('');
    });

  } finally {
    await browser.close();
  }
}

listAllFarms().catch(console.error);
