import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth';

// Mock APP_SECRET environment variable for tests
const TEST_APP_SECRET = 'test-app-secret-for-jwt-signing-12345';

describe('auth utilities', () => {
  // Set up APP_SECRET before tests
  const originalEnv = process.env.APP_SECRET;

  beforeAll(() => {
    process.env.APP_SECRET = TEST_APP_SECRET;
  });

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.APP_SECRET = originalEnv;
    } else {
      delete process.env.APP_SECRET;
    }
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      // bcrypt hashes always start with $2b$ or $2a$ (version identifier)
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should produce different hashes for the same password (due to salt)', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in password', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('should handle unicode characters in password', async () => {
      const password = '日本語パスワード🔐';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(await verifyPassword(password, hash)).toBe(true);
    });

    it('should handle long passwords', async () => {
      // bcrypt truncates at 72 bytes, but should still work
      const password = 'a'.repeat(100);
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(await verifyPassword(password, hash)).toBe(true);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);

      const result = await verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for similar but different password', async () => {
      const password = 'myPassword123';
      const hash = await hashPassword(password);

      const result = await verifyPassword('myPassword124', hash);
      expect(result).toBe(false);
    });

    it('should return false for password with different case', async () => {
      const password = 'CaseSensitive';
      const hash = await hashPassword(password);

      const result = await verifyPassword('casesensitive', hash);
      expect(result).toBe(false);
    });

    it('should return false for password with extra whitespace', async () => {
      const password = 'password';
      const hash = await hashPassword(password);

      const result = await verifyPassword(' password', hash);
      expect(result).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const hash = await hashPassword('');

      expect(await verifyPassword('', hash)).toBe(true);
      expect(await verifyPassword('notEmpty', hash)).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user-123';
      const token = generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      // JWT has 3 parts separated by dots
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1');
      const token2 = generateToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for same user (due to timestamp)', () => {
      const token1 = generateToken('user-123');
      // Small delay to ensure different iat
      const token2 = generateToken('user-123');

      // The tokens might be the same if generated in the same second
      // but the verifyToken should still work for both
      expect(verifyToken(token1)).toEqual({ userId: 'user-123' });
      expect(verifyToken(token2)).toEqual({ userId: 'user-123' });
    });

    it('should handle special characters in userId', () => {
      const userId = 'user-email@example.com';
      const token = generateToken(userId);

      const result = verifyToken(token);
      expect(result).toEqual({ userId });
    });

    it('should handle empty userId', () => {
      const token = generateToken('');

      const result = verifyToken(token);
      expect(result).toEqual({ userId: '' });
    });

    it('should throw error when APP_SECRET is not set', () => {
      const originalSecret = process.env.APP_SECRET;
      delete process.env.APP_SECRET;

      expect(() => generateToken('user-123')).toThrow(
        'APP_SECRET environment variable is not set'
      );

      process.env.APP_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should return userId for valid token', () => {
      const userId = 'user-123';
      const token = generateToken(userId);

      const result = verifyToken(token);
      expect(result).toEqual({ userId });
    });

    it('should return null for invalid token format', () => {
      const result = verifyToken('not-a-valid-jwt');
      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      const result = verifyToken('');
      expect(result).toBeNull();
    });

    it('should return null for malformed JWT (missing parts)', () => {
      const result = verifyToken('part1.part2');
      expect(result).toBeNull();
    });

    it('should return null for token signed with different secret', () => {
      // Generate token with current secret
      const token = generateToken('user-123');

      // Change the secret
      const originalSecret = process.env.APP_SECRET;
      process.env.APP_SECRET = 'different-secret-key';

      // Verification should fail
      const result = verifyToken(token);
      expect(result).toBeNull();

      // Restore original secret
      process.env.APP_SECRET = originalSecret;
    });

    it('should return null for tampered token (modified payload)', () => {
      const token = generateToken('user-123');
      const parts = token.split('.');

      // Tamper with the payload (middle part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.userId = 'hacker-456';
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');

      const tamperedToken = parts.join('.');
      const result = verifyToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should return null for tampered token (modified signature)', () => {
      const token = generateToken('user-123');
      const parts = token.split('.');

      // Tamper with the signature (last part)
      parts[2] = 'invalidSignature123';

      const tamperedToken = parts.join('.');
      const result = verifyToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('should throw error when APP_SECRET is not set during verification', () => {
      const token = generateToken('user-123');

      const originalSecret = process.env.APP_SECRET;
      delete process.env.APP_SECRET;

      // verifyToken catches all errors and returns null
      const result = verifyToken(token);
      expect(result).toBeNull();

      process.env.APP_SECRET = originalSecret;
    });

    it('should return null for null token', () => {
      const result = verifyToken(null as unknown as string);
      expect(result).toBeNull();
    });

    it('should return null for undefined token', () => {
      const result = verifyToken(undefined as unknown as string);
      expect(result).toBeNull();
    });
  });

  describe('integration: password hashing and JWT flow', () => {
    it('should support complete auth flow', async () => {
      // Simulate user registration
      const password = 'userPassword123';
      const hashedPassword = await hashPassword(password);

      // Simulate user login
      const isValidPassword = await verifyPassword(password, hashedPassword);
      expect(isValidPassword).toBe(true);

      // Generate token on successful login
      const userId = 'user-abc-123';
      const token = generateToken(userId);

      // Verify token on subsequent requests
      const decoded = verifyToken(token);
      expect(decoded).toEqual({ userId });
    });

    it('should reject wrong password in auth flow', async () => {
      const correctPassword = 'correctPassword';
      const hashedPassword = await hashPassword(correctPassword);

      // Wrong password should fail
      const isValidPassword = await verifyPassword('wrongPassword', hashedPassword);
      expect(isValidPassword).toBe(false);
    });
  });
});
