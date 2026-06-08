import { ZohoEmailDelivery, createEmailDelivery } from '../src/delivery/zoho-email';

describe('ZohoEmailDelivery', () => {
  describe('constructor', () => {
    it('should create instance with recipient and dry-run flag', () => {
      const delivery = new ZohoEmailDelivery('test@example.com', false);
      expect(delivery).toBeDefined();
    });

    it('should default to non-dry-run mode', () => {
      const delivery = new ZohoEmailDelivery('test@example.com');
      expect(delivery).toBeDefined();
    });
  });

  describe('send', () => {
    it('should return true in dry-run mode', async () => {
      const delivery = new ZohoEmailDelivery('test@example.com', true);
      const result = await delivery.send({
        subject: 'Test Subject',
        body: 'Test body',
        recipient: 'test@example.com',
        farmName: 'TEST FARM',
      });

      expect(result).toBe(true);
    });

    it('should accept EmailPayload with all fields', async () => {
      const delivery = new ZohoEmailDelivery('test@example.com', true);
      const payload = {
        subject: 'FONTANA ALISHA — Daily Status (08-Jun-2026)',
        body: 'Daily report body',
        recipient: 'evert@greenspark.co.ke',
        farmName: 'FONTANA ALISHA',
      };

      const result = await delivery.send(payload);
      expect(result).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true for valid email address', async () => {
      const delivery = new ZohoEmailDelivery('valid@example.com');
      const result = await delivery.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false for invalid email address', async () => {
      const delivery = new ZohoEmailDelivery('invalid-email');
      const result = await delivery.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false for empty email', async () => {
      const delivery = new ZohoEmailDelivery('');
      const result = await delivery.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('createEmailDelivery factory', () => {
    it('should create delivery instance with dry-run flag', () => {
      const delivery = createEmailDelivery(true);
      expect(delivery).toBeInstanceOf(ZohoEmailDelivery);
    });

    it('should create delivery instance without dry-run flag', () => {
      const delivery = createEmailDelivery(false);
      expect(delivery).toBeInstanceOf(ZohoEmailDelivery);
    });

    it('should use default recipient from env or fallback', () => {
      const delivery = createEmailDelivery();
      expect(delivery).toBeDefined();
      // The actual recipient depends on environment setup
    });
  });

  describe('Email format validation', () => {
    it('should handle plain text body', async () => {
      const delivery = new ZohoEmailDelivery('test@example.com', true);
      const plainTextBody = 'Line 1\nLine 2\nLine 3';

      const result = await delivery.send({
        subject: 'Test',
        body: plainTextBody,
        recipient: 'test@example.com',
        farmName: 'FARM',
      });

      expect(result).toBe(true);
    });

    it('should handle long subjects', async () => {
      const delivery = new ZohoEmailDelivery('test@example.com', true);
      const longSubject = 'FONTANA ALISHA — Daily Status (08-Jun-2026) — Extended Report';

      const result = await delivery.send({
        subject: longSubject,
        body: 'Body',
        recipient: 'test@example.com',
        farmName: 'FONTANA ALISHA',
      });

      expect(result).toBe(true);
    });
  });
});
