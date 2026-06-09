import dotenv from 'dotenv';
import { getTodayAllFarms } from './src/database/supabase-client.js';
import { renderManagementReport, buildManagementSubject } from './src/renderers/management-report.js';
import { createEmailDelivery } from './src/delivery/zoho-email.js';

dotenv.config();

async function sendTestEmail() {
  const todayDate = new Date().toISOString().split('T')[0];

  console.log(`\n========================================`);
  console.log(`TEST EMAIL - All Fontana Farms (Real Data)`);
  console.log(`Date: ${todayDate}`);
  console.log(`========================================\n`);

  try {
    // Get real data from Supabase
    console.log(`[1/3] Fetching real data from Supabase...`);
    const allFarmData = await getTodayAllFarms(todayDate);

    if (!allFarmData || allFarmData.length === 0) {
      console.log(`⚠️  No scrape data found for ${todayDate}`);
      console.log(`   (Scraper may not have run yet today)\n`);
      return;
    }

    console.log(`✅ Found ${allFarmData.length} scrape records\n`);

    // Group by farm for report
    const farmMap = new Map();
    allFarmData.forEach((record: any) => {
      const farmId = record.farm_id;
      if (!farmMap.has(farmId)) {
        farmMap.set(farmId, {
          farm_id: farmId,
          farm_name: record.farm_name,
          kwh_produced: 0,
          kwh_expected: 0,
          system_status: 'PRODUCING',
          performance_ratio: 0,
          allSystems: []
        });
      }
      const farm = farmMap.get(farmId);
      farm.kwh_produced += record.kwh || 0;
      farm.allSystems.push({
        name: record.system_name || 'Unknown',
        kwh: record.kwh || 0,
        status: (record.kwh || 0) > 0 ? 'PRODUCING' : 'NOT_PRODUCING',
        inverters: []
      });
    });

    const farmList = Array.from(farmMap.values());

    console.log(`[2/3] Generating report...`);
    const subject = buildManagementSubject(todayDate);
    const body = renderManagementReport(farmList, todayDate);

    console.log(`\n${body}\n`);

    console.log(`[3/3] Sending email to evert@greenspark.co.ke...`);
    const emailDelivery = createEmailDelivery(false);
    const sent = await emailDelivery.send({
      subject,
      body,
      recipient: 'evert@greenspark.co.ke',
      farmName: 'All Farms',
    });

    if (sent) {
      console.log(`✅ EMAIL SENT!`);
    } else {
      console.log(`⚠️  Email payload logged (check Zoho delivery)`);
    }

    console.log(`\n========================================`);
    console.log(`Test complete`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

sendTestEmail();
