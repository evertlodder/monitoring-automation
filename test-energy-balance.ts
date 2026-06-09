import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function testEnergyBalance() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Login
    await page.goto('https://www.solarweb.com/Account/ExternalLogin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('input[name="usernameUserInput"]', process.env.SOLARWEB_USERNAME!);
    await page.fill('input[name="password"]', process.env.SOLARWEB_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(PvSystems|Dashboard)/, { timeout: 30000 });

    // Get a system ID (first one)
    const systemIds = await page.$$eval(
      'a[href*="/PvSystems/PvSystem?pvSystemId="]',
      (links) =>
        links
          .map((link) => {
            const href = link.getAttribute('href');
            const match = href?.match(/pvSystemId=([a-f0-9-]+)/);
            const text = (link.textContent || '').trim();
            return match ? { id: match[1], name: text } : null;
          })
          .filter((item) => item && item.name.includes('Gate'))
    );

    if (systemIds.length > 0) {
      const systemId = systemIds[0].id;
      console.log(`Testing Energy Balance for Gate (${systemId})...`);

      // Navigate to Energy Balance
      const origin = new URL(page.url()).origin;
      await page.goto(`${origin}/PvSystems/EnergyBalance?pvSystemId=${systemId}`, { waitUntil: 'networkidle' });

      // Save screenshot
      await page.screenshot({ path: 'energy-balance-test.png' });

      // Get page text
      const pageText = await page.innerText('body');
      console.log('=== ENERGY BALANCE PAGE TEXT (first 2000 chars) ===');
      console.log(pageText.substring(0, 2000));
      
      // Look for offline patterns
      console.log('\n=== SEARCHING FOR OFFLINE PATTERNS ===');
      const lines = pageText.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('offline') || line.toLowerCase().includes('date') || line.toLowerCase().includes('failed')) {
          console.log(`Line ${idx}: ${line}`);
        }
      });
    }
  } finally {
    await browser.close();
  }
}

testEnergyBalance().catch(console.error);
