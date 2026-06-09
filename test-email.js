import dotenv from 'dotenv';
import { renderDailyTechMessage, buildEmailSubject } from './dist/renderers/daily-tech-message.js';
import { createEmailDelivery } from './dist/delivery/zoho-email.js';

dotenv.config();

async function sendTestEmail() {
  console.log('Sending test email with mock data...\n');

  // Mock data with inverters
  const mockData = {
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
          { name: 'Symo 20.0-3-M (1)', kw: 16.843, percentage: 71, color: 'green', status: 'OPTIMAL' },
          { name: 'Symo 20.0-3-M (2)', kw: 16.867, percentage: 71, color: 'green', status: 'OPTIMAL' },
          { name: 'Symo 20.0-3-M (3)', kw: 11.513, percentage: 55, color: 'yellow', status: 'UNDERPERFORMING' },
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

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Render email
  const emailBody = renderDailyTechMessage(mockData, dateStr);
  const emailSubject = buildEmailSubject(mockData.farm_name, dateStr);

  console.log('Subject:', emailSubject);
  console.log('\n--- EMAIL BODY ---');
  console.log(emailBody);
  console.log('--- END BODY ---\n');

  // Send
  const emailDelivery = createEmailDelivery(false); // Not dry-run
  const healthy = await emailDelivery.healthCheck();

  if (!healthy) {
    console.error('Email configuration invalid');
    return;
  }

  const sent = await emailDelivery.send({
    subject: emailSubject,
    body: emailBody,
    recipient: process.env.ZOHO_RECIPIENT_EMAIL || 'evert@greenspark.co.ke',
    farmName: mockData.farm_name,
  });

  if (sent) {
    console.log('✅ Email sent successfully');
  } else {
    console.error('❌ Email send failed');
  }
}

sendTestEmail().catch(console.error);
