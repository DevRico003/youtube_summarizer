import { encrypt, decrypt } from '@/lib/encryption';

describe('encryption', () => {
  const testSecret = 'my-super-secret-key-12345';
  const alternativeSecret = 'different-secret-key-98765';

  describe('encrypt/decrypt roundtrip', () => {
    it('should encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt an empty string', () => {
      // Note: Empty string should throw according to implementation
      expect(() => encrypt('', testSecret)).toThrow('Plaintext and secret are required');
    });

    it('should encrypt and decrypt a long string', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt special characters', () => {
      const plaintext = '🔐 API_KEY=sk-12345!@#$%^&*()_+{}[]|;:\'",.<>?/\\`~';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt unicode characters', () => {
      const plaintext = '日本語テスト 中文测试 한국어테스트 العربية';
      const encrypted = encrypt(plaintext, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random salt/IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encrypt(plaintext, testSecret);
      const encrypted2 = encrypt(plaintext, testSecret);

      expect(encrypted1).not.toBe(encrypted2);

      // Both should decrypt to the same value
      expect(decrypt(encrypted1, testSecret)).toBe(plaintext);
      expect(decrypt(encrypted2, testSecret)).toBe(plaintext);
    });

    it('should handle JSON-formatted API keys', () => {
      const apiKey = '{"key": "sk-abc123", "project": "my-project"}';
      const encrypted = encrypt(apiKey, testSecret);
      const decrypted = decrypt(encrypted, testSecret);

      expect(decrypted).toBe(apiKey);
      expect(JSON.parse(decrypted)).toEqual({
        key: 'sk-abc123',
        project: 'my-project',
      });
    });
  });

  describe('error handling for invalid input', () => {
    it('should throw error when plaintext is null', () => {
      expect(() => encrypt(null as unknown as string, testSecret)).toThrow(
        'Plaintext and secret are required'
      );
    });

    it('should throw error when plaintext is undefined', () => {
      expect(() => encrypt(undefined as unknown as string, testSecret)).toThrow(
        'Plaintext and secret are required'
      );
    });

    it('should throw error when secret is empty', () => {
      expect(() => encrypt('test', '')).toThrow('Plaintext and secret are required');
    });

    it('should throw error when secret is null', () => {
      expect(() => encrypt('test', null as unknown as string)).toThrow(
        'Plaintext and secret are required'
      );
    });

    it('should throw error when ciphertext is empty', () => {
      expect(() => decrypt('', testSecret)).toThrow('Ciphertext and secret are required');
    });

    it('should throw error when ciphertext is null', () => {
      expect(() => decrypt(null as unknown as string, testSecret)).toThrow(
        'Ciphertext and secret are required'
      );
    });

    it('should throw error when decrypting with empty secret', () => {
      const encrypted = encrypt('test', testSecret);
      expect(() => decrypt(encrypted, '')).toThrow('Ciphertext and secret are required');
    });

    it('should throw error for invalid base64 ciphertext', () => {
      expect(() => decrypt('not-valid-base64!!!', testSecret)).toThrow();
    });

    it('should throw error for ciphertext that is too short', () => {
      // Minimum length is salt(16) + iv(12) + authTag(16) + 1 byte = 45 bytes
      // A short base64 string will decode to fewer bytes
      const shortCiphertext = Buffer.from('short').toString('base64');
      expect(() => decrypt(shortCiphertext, testSecret)).toThrow(
        'Invalid ciphertext: too short'
      );
    });
  });

  describe('error handling for wrong secret', () => {
    it('should throw error when decrypting with wrong secret', () => {
      const plaintext = 'Secret message';
      const encrypted = encrypt(plaintext, testSecret);

      expect(() => decrypt(encrypted, alternativeSecret)).toThrow(
        'Decryption failed: invalid ciphertext or wrong secret'
      );
    });

    it('should throw error when decrypting with slightly different secret', () => {
      const plaintext = 'Secret message';
      const encrypted = encrypt(plaintext, testSecret);

      // One character different
      const wrongSecret = testSecret.slice(0, -1) + 'x';
      expect(() => decrypt(encrypted, wrongSecret)).toThrow(
        'Decryption failed: invalid ciphertext or wrong secret'
      );
    });

    it('should throw error when ciphertext is tampered with', () => {
      const plaintext = 'Secret message';
      const encrypted = encrypt(plaintext, testSecret);

      // Tamper with the middle of the ciphertext
      const tamperedBuffer = Buffer.from(encrypted, 'base64');
      tamperedBuffer[tamperedBuffer.length - 5] ^= 0xff;
      const tampered = tamperedBuffer.toString('base64');

      expect(() => decrypt(tampered, testSecret)).toThrow(
        'Decryption failed: invalid ciphertext or wrong secret'
      );
    });
  });

  describe('security properties', () => {
    it('should not leak plaintext in ciphertext', () => {
      const plaintext = 'SENSITIVE_API_KEY_12345';
      const encrypted = encrypt(plaintext, testSecret);

      // The plaintext should not appear in the base64-encoded ciphertext
      expect(encrypted).not.toContain(plaintext);
      expect(encrypted).not.toContain('SENSITIVE');
      expect(encrypted).not.toContain('API_KEY');
    });

    it('should produce ciphertext longer than plaintext', () => {
      const plaintext = 'x';
      const encrypted = encrypt(plaintext, testSecret);

      // Ciphertext should be longer due to salt, IV, and auth tag
      // Minimum overhead: 16 (salt) + 12 (IV) + 16 (authTag) = 44 bytes
      // Plus base64 encoding adds ~33% overhead
      expect(Buffer.from(encrypted, 'base64').length).toBeGreaterThan(44);
    });
  });
});
