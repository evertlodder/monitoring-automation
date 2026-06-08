import { renderDailyTechMessage, renderMultiFarmSummary, buildEmailSubject } from '../src/renderers/daily-tech-message';
import { ScraperResult } from '../src/scraper/playwright-scraper';

describe('Daily Tech Message Renderer', () => {
  const sampleData: ScraperResult = {
    farm_name: 'FONTANA ALISHA',
    kwh_produced: 45.23,
    kwh_expected: 52.50,
    system_status: 'PRODUCING',
    performance_ratio: 86.15,
  };

  describe('renderDailyTechMessage', () => {
    it('should render a message with all required fields', () => {
      const message = renderDailyTechMessage(sampleData, '2026-06-08');

      expect(message).toContain('FONTANA ALISHA');
      expect(message).toContain('2026-06-08');
      expect(message).toContain('45.23 kWh');
      expect(message).toContain('52.50 kWh');
      expect(message).toContain('✅ PRODUCING');
      expect(message).toContain('86.15%');
    });

    it('should show NOT_PRODUCING status when system is off', () => {
      const offlineData: ScraperResult = {
        ...sampleData,
        system_status: 'NOT_PRODUCING',
        kwh_produced: 0,
      };

      const message = renderDailyTechMessage(offlineData, '2026-06-08');
      expect(message).toContain('❌ NOT_PRODUCING');
    });

    it('should calculate performance percentage correctly', () => {
      const message = renderDailyTechMessage(sampleData, '2026-06-08');
      // 45.23 / 52.50 * 100 = 86.15%
      expect(message).toContain('86%');
    });

    it('should handle zero expected production', () => {
      const zeroExpectedData: ScraperResult = {
        ...sampleData,
        kwh_expected: 0,
      };

      const message = renderDailyTechMessage(zeroExpectedData, '2026-06-08');
      expect(message).toContain('0%');
    });

    it('should format plain text output', () => {
      const message = renderDailyTechMessage(sampleData, '2026-06-08');

      // Should not contain any markdown
      expect(message).not.toContain('**');
      expect(message).not.toContain('_');
      expect(message).not.toContain('#');

      // Should be newline-separated
      expect(message).toContain('\n');
    });
  });

  describe('buildEmailSubject', () => {
    it('should format subject with farm name and date', () => {
      const subject = buildEmailSubject('FONTANA ALISHA', '2026-06-08');
      expect(subject).toBe('FONTANA ALISHA — Daily Status (08-Jun-2026)');
    });

    it('should pad day with leading zero', () => {
      const subject = buildEmailSubject('TEST FARM', '2026-06-05');
      expect(subject).toContain('05-Jun');
    });

    it('should use correct month abbreviations', () => {
      const months = [
        { date: '2026-01-15', expected: 'Jan' },
        { date: '2026-02-15', expected: 'Feb' },
        { date: '2026-06-15', expected: 'Jun' },
        { date: '2026-12-15', expected: 'Dec' },
      ];

      months.forEach(({ date, expected }) => {
        const subject = buildEmailSubject('FARM', date);
        expect(subject).toContain(expected);
      });
    });

    it('should handle single-digit days', () => {
      const subject = buildEmailSubject('FARM', '2026-06-01');
      expect(subject).toContain('01-Jun');
    });
  });

  describe('renderMultiFarmSummary', () => {
    it('should render summary for multiple farms', () => {
      const farms: ScraperResult[] = [sampleData, { ...sampleData, farm_name: 'SECOND FARM' }];

      const summary = renderMultiFarmSummary(farms, '2026-06-08');

      expect(summary).toContain('Daily Solar Farm Status Report');
      expect(summary).toContain('Total farms: 2');
      expect(summary).toContain('FONTANA ALISHA');
      expect(summary).toContain('SECOND FARM');
    });

    it('should calculate totals correctly', () => {
      const farms: ScraperResult[] = [
        { ...sampleData, kwh_produced: 10, kwh_expected: 20 },
        { ...sampleData, kwh_produced: 20, kwh_expected: 30 },
      ];

      const summary = renderMultiFarmSummary(farms, '2026-06-08');

      expect(summary).toContain('30.00 kWh'); // total produced
      expect(summary).toContain('50.00 kWh'); // total expected
    });

    it('should count producing farms', () => {
      const farms: ScraperResult[] = [
        { ...sampleData, system_status: 'PRODUCING' },
        { ...sampleData, system_status: 'NOT_PRODUCING' },
      ];

      const summary = renderMultiFarmSummary(farms, '2026-06-08');

      expect(summary).toContain('Farms producing: 1/2');
    });
  });
});
