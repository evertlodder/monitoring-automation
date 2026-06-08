import { SolarWebScraper } from '../src/scraper/playwright-scraper';
import { parseKwhValue, parseSystemStatus, MOCK_SOLARWEB_DATA } from '../src/scraper/solarweb-selectors';

describe('SolarWebScraper', () => {
  describe('parseKwhValue', () => {
    it('should parse kWh values with comma separator', () => {
      const result = parseKwhValue('2,345 kWh');
      expect(result).toBe(2.345);
    });

    it('should parse kWh values with dot separator', () => {
      const result = parseKwhValue('45.23 kWh');
      expect(result).toBe(45.23);
    });

    it('should parse plain numbers', () => {
      const result = parseKwhValue('100');
      expect(result).toBe(100);
    });

    it('should return null for invalid input', () => {
      const result = parseKwhValue('invalid');
      expect(result).toBeNull();
    });

    it('should handle empty strings', () => {
      const result = parseKwhValue('');
      expect(result).toBeNull();
    });
  });

  describe('parseSystemStatus', () => {
    it('should recognize PRODUCING status', () => {
      expect(parseSystemStatus('PRODUCING')).toBe('PRODUCING');
      expect(parseSystemStatus('ON')).toBe('PRODUCING');
      expect(parseSystemStatus('OK')).toBe('PRODUCING');
    });

    it('should recognize NOT_PRODUCING status', () => {
      expect(parseSystemStatus('NOT_PRODUCING')).toBe('NOT_PRODUCING');
      expect(parseSystemStatus('OFF')).toBe('NOT_PRODUCING');
      expect(parseSystemStatus('ERROR')).toBe('NOT_PRODUCING');
    });

    it('should handle case insensitivity', () => {
      expect(parseSystemStatus('producing')).toBe('PRODUCING');
      expect(parseSystemStatus('not_producing')).toBe('NOT_PRODUCING');
    });

    it('should trim whitespace', () => {
      expect(parseSystemStatus('  PRODUCING  ')).toBe('PRODUCING');
    });
  });

  describe('Dry-run mode', () => {
    it('should return mock data when dry-run is enabled', async () => {
      const scraper = new SolarWebScraper('test@example.com', 'password', true);
      const result = await scraper.run();

      expect(result).toEqual(MOCK_SOLARWEB_DATA);
    });

    it('should skip browser initialization in dry-run mode', async () => {
      const scraper = new SolarWebScraper('test@example.com', 'password', true);
      await scraper.initialize();
      // Should not throw
    });
  });

  describe('Mock data', () => {
    it('should have valid mock data structure', () => {
      expect(MOCK_SOLARWEB_DATA).toHaveProperty('farm_name');
      expect(MOCK_SOLARWEB_DATA).toHaveProperty('kwh_produced');
      expect(MOCK_SOLARWEB_DATA).toHaveProperty('kwh_expected');
      expect(MOCK_SOLARWEB_DATA).toHaveProperty('system_status');
      expect(MOCK_SOLARWEB_DATA).toHaveProperty('performance_ratio');

      expect(typeof MOCK_SOLARWEB_DATA.farm_name).toBe('string');
      expect(typeof MOCK_SOLARWEB_DATA.kwh_produced).toBe('number');
      expect(typeof MOCK_SOLARWEB_DATA.kwh_expected).toBe('number');
      expect(typeof MOCK_SOLARWEB_DATA.system_status).toBe('string');
      expect(typeof MOCK_SOLARWEB_DATA.performance_ratio).toBe('number');
    });
  });
});
