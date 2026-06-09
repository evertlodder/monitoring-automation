import dotenv from 'dotenv';
import { getTodayAllFarms } from './src/database/supabase-client.js';
import { renderManagementReport, buildManagementSubject } from './src/renderers/management-report.js';
import { createEmailDelivery } from './src/delivery/zoho-email.js';

dotenv.config();

async function sendTestEmail() {
  const todayDate = new Date().toISOString().split('T')[0];

  console.log(`\n========================================`);
  console.log(`TEST EMAIL - Fontana Daily Overview`);
  console.log(`Date: ${todayDate}`);
  console.log(`Recipient: evert@greenspark.co.ke`);
  console.log(`========================================\n`);

  try {
    // Get today's data for all farms
    const allFarmData = await getTodayAllFarms(todayDate);

    if (!allFarmData || allFarmData.length === 0) {
      console.log('⚠️  No scrape data found for today.');
      console.log('   (This is OK if scraper hasn\'t run yet today)');
      console.log('   Using mock data for test email...\n');

      // Create mock data for testing
      const mockData = [
        {
          farm_id: 'alisha',
          farm_name: 'Fontana Alisha',
          kwh: 831.92,
          kwh_expected: 157.5,
          status: 'PRODUCING',
          allSystems: [
            { name: 'Gate', kwh: 634.64, status: 'PRODUCING', inverters: [] },
            { name: 'Office', kwh: 1.33, status: 'PRODUCING', inverters: [] },
            { name: 'Rootstock', kwh: 195.95, status: 'PRODUCING', inverters: [] },
          ]
        },
        {
          farm_id: 'ayana',
          farm_name: 'Fontana Ayana',
          kwh: 425.85,
          kwh_expected: 100,
          status: 'PRODUCING',
          allSystems: [
            { name: 'Camp', kwh: 242.12, status: 'PRODUCING', inverters: [] },
            { name: 'Office', kwh: 1.28, status: 'PRODUCING', inverters: [] },
            { name: 'Silage', kwh: 182.45, status: 'PRODUCING', inverters: [] },
          ]
        },
        {
          farm_id: 'akina',
          farm_name: 'Fontana Akina',
          kwh: 1134.25,
          kwh_expected: 180,
          status: 'PRODUCING',
          allSystems: [
            { name: 'dam', kwh: 432.08, status: 'PRODUCING', inverters: [] },
            { name: 'roof', kwh: 702.17, status: 'PRODUCING', inverters: [] },
          ]
        },
        {
          farm_id: 'bigflowers',
          farm_name: 'Fontana Big Flowers',
          kwh: 144.31,
          kwh_expected: 120,
          status: 'PRODUCING',
          allSystems: [
            { name: 'Dam', kwh: 141.91, status: 'PRODUCING', inverters: [] },
            { name: '234 kW', kwh: 2.40, status: 'PRODUCING', inverters: [] },
          ]
        }
      ];

      const subject = buildManagementSubject(todayDate);
      const body = renderManagementReport(mockData, todayDate);

      console.log(`📧 Generating test email...\n`);
      console.log(`Subject: ${subject}\n`);
      console.log(`Body:\n${body}\n`);

      // Send via Zoho
      const emailDelivery = createEmailDelivery(false);
      const sent = await emailDelivery.send({
        subject,
        body,
        recipient: 'evert@greenspark.co.ke',
        farmName: 'All Farms',
      });

      if (sent) {
        console.log(`✅ TEST EMAIL SENT to evert@greenspark.co.ke`);
      } else {
        console.log(`⚠️  Email payload logged (check MCP delivery)`);
      }

      console.log(`\n========================================`);
      console.log(`Test complete`);
      console.log(`========================================\n`);

    } else {
      // Real data exists
      const subject = buildManagementSubject(todayDate);
      const body = renderManagementReport(allFarmData, todayDate);

      console.log(`📧 Real data found! Sending email...\n`);
      console.log(`Subject: ${subject}\n`);

      const emailDelivery = createEmailDelivery(false);
      const sent = await emailDelivery.send({
        subject,
        body,
        recipient: 'evert@greenspark.co.ke',
        farmName: 'All Farms',
      });

      if (sent) {
        console.log(`✅ EMAIL SENT to evert@greenspark.co.ke`);
      }

      console.log(`\n========================================`);
      console.log(`Email delivery complete`);
      console.log(`========================================\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

sendTestEmail();
