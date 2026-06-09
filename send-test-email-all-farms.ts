import dotenv from 'dotenv';
import { renderManagementReport, buildManagementSubject } from './src/renderers/management-report.js';
import { createEmailDelivery } from './src/delivery/zoho-email.js';

dotenv.config();

async function sendTestEmail() {
  const todayDate = new Date().toISOString().split('T')[0];

  console.log(`\n========================================`);
  console.log(`TEST EMAIL - All Fontana Farms Overview`);
  console.log(`Date: ${todayDate}`);
  console.log(`Recipient: evert@greenspark.co.ke`);
  console.log(`========================================\n`);

  // Mock data for all 4 farms with real inverter details
  const mockData = [
    {
      farm_id: 'alisha',
      farm_name: 'Fontana Alisha',
      kwh_produced: 831.92,
      kwh_expected: 247.5,
      system_status: 'PRODUCING',
      performance_ratio: 336,
      allSystems: [
        {
          name: 'Gate',
          kwh: 634.64,
          status: 'PRODUCING',
          inverters: [
            { kw: 15.51 },
            { kw: 15.50 },
            { kw: 15.47 }
          ]
        },
        {
          name: 'Office',
          kwh: 1.33,
          status: 'PRODUCING',
          inverters: [
            { kw: 15.43 },
            { kw: 15.49 },
            { kw: 15.56 },
            { kw: 15.61 },
            { kw: 15.49 },
            { kw: 15.41 }
          ]
        },
        {
          name: 'Rootstock',
          kwh: 195.95,
          status: 'PRODUCING',
          inverters: [
            { kw: 9.33 },
            { kw: 9.34 }
          ]
        }
      ]
    },
    {
      farm_id: 'ayana',
      farm_name: 'Fontana Ayana',
      kwh_produced: 425.85,
      kwh_expected: 100,
      system_status: 'PRODUCING',
      performance_ratio: 426,
      allSystems: [
        {
          name: 'Camp',
          kwh: 242.12,
          status: 'PRODUCING',
          inverters: [
            { kw: 3483.00 },
            { kw: 3484.00 },
            { kw: 3484.00 }
          ]
        },
        {
          name: 'Office',
          kwh: 1.28,
          status: 'OFFLINE',
          inverters: []
        },
        {
          name: 'Silage',
          kwh: 182.45,
          status: 'PRODUCING',
          inverters: [
            { kw: 7.09 },
            { kw: 7.11 }
          ]
        }
      ]
    },
    {
      farm_id: 'akina',
      farm_name: 'Fontana Akina',
      kwh_produced: 1134.25,
      kwh_expected: 180,
      system_status: 'PRODUCING',
      performance_ratio: 630,
      allSystems: [
        {
          name: 'dam',
          kwh: 432.08,
          status: 'OFFLINE',
          inverters: []
        },
        {
          name: 'roof',
          kwh: 702.17,
          status: 'PRODUCING',
          inverters: [
            { kw: 175.54 },
            { kw: 175.63 },
            { kw: 175.50 },
            { kw: 175.50 }
          ]
        }
      ]
    },
    {
      farm_id: 'bigflowers',
      farm_name: 'Fontana Big Flowers',
      kwh_produced: 144.31,
      kwh_expected: 120,
      system_status: 'PRODUCING',
      performance_ratio: 120,
      allSystems: [
        {
          name: 'Dam',
          kwh: 141.91,
          status: 'PRODUCING',
          inverters: [
            { kw: 14.59 }
          ]
        },
        {
          name: '234 kW',
          kwh: 2.40,
          status: 'PRODUCING',
          inverters: [
            { kw: 0.30 },
            { kw: 0.31 },
            { kw: 0.29 },
            { kw: 0.30 },
            { kw: 0.29 },
            { kw: 0.30 },
            { kw: 0.31 },
            { kw: 0.29 },
            { kw: 0.30 }
          ]
        }
      ]
    }
  ];

  const subject = buildManagementSubject(todayDate);
  const body = renderManagementReport(mockData, todayDate);

  console.log(`📧 Email Preview:\n`);
  console.log(`Subject: ${subject}\n`);
  console.log(`Body:\n${body}\n`);
  console.log(`========================================\n`);

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
    console.log(`⚠️  Email payload logged (check Zoho delivery)`);
  }

  console.log(`\n========================================`);
  console.log(`Test complete`);
  console.log(`========================================\n`);
}

sendTestEmail().catch(console.error);
