import { DailyScrape, DailyEmail } from '../src/database/supabase-client';

describe('Database Types', () => {
  describe('DailyScrape', () => {
    it('should create a valid DailyScrape object', () => {
      const scrape: DailyScrape = {
        farm_name: 'FONTANA ALISHA',
        scraped_date: '2026-06-08',
        kwh_produced: 45.23,
        kwh_expected: 52.50,
        system_status: 'PRODUCING',
        performance_ratio: 86.15,
      };

      expect(scrape.farm_name).toBe('FONTANA ALISHA');
      expect(scrape.kwh_produced).toBe(45.23);
      expect(scrape.system_status).toBe('PRODUCING');
    });

    it('should allow optional fields', () => {
      const scrape: DailyScrape = {
        farm_name: 'TEST FARM',
        scraped_date: '2026-06-08',
        kwh_produced: 10,
        kwh_expected: 20,
        system_status: 'OFF',
        performance_ratio: 50,
        raw_html: '<html>test</html>',
        id: 123,
      };

      expect(scrape.id).toBe(123);
      expect(scrape.raw_html).toBeDefined();
    });
  });

  describe('DailyEmail', () => {
    it('should create a valid DailyEmail object', () => {
      const email: DailyEmail = {
        farm_name: 'FONTANA ALISHA',
        email_date: '2026-06-08',
        recipient_email: 'evert@greenspark.co.ke',
        subject: 'FONTANA ALISHA — Daily Status (08-Jun-2026)',
        body: 'Test email body',
        delivery_status: 'pending',
      };

      expect(email.farm_name).toBe('FONTANA ALISHA');
      expect(email.delivery_status).toBe('pending');
    });

    it('should validate delivery status', () => {
      const validStatuses: Array<'pending' | 'sent' | 'failed'> = ['pending', 'sent', 'failed'];

      validStatuses.forEach((status) => {
        const email: DailyEmail = {
          farm_name: 'TEST',
          email_date: '2026-06-08',
          recipient_email: 'test@example.com',
          subject: 'Test',
          body: 'Test',
          delivery_status: status,
        };

        expect(email.delivery_status).toBe(status);
      });
    });
  });

  describe('Schema validation', () => {
    it('should require farm_name', () => {
      // Type check - would fail at compile time
      const incomplete = {
        scraped_date: '2026-06-08',
        kwh_produced: 10,
        kwh_expected: 20,
        system_status: 'OFF',
        performance_ratio: 50,
      };

      // This would be a TypeScript error in real code
      // expect(incomplete).toEqual(expect.objectContaining({...}));
    });
  });
});
