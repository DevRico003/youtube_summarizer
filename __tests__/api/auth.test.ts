import { NextRequest } from 'next/server';
import { POST as registerHandler } from '@/app/api/auth/register/route';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { hashPassword } from '@/lib/auth';

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  const mockFindUnique = jest.fn();
  const mockCreate = jest.fn();
  return {
    prisma: {
      user: {
        findUnique: mockFindUnique,
        create: mockCreate,
      },
    },
    // Export mock functions for test usage
    __mockFindUnique: mockFindUnique,
    __mockCreate: mockCreate,
  };
});

// Get reference to mocked functions
const { __mockFindUnique: mockFindUnique, __mockCreate: mockCreate } = jest.requireMock('@/lib/prisma');

// Set up APP_SECRET for JWT generation
const TEST_APP_SECRET = 'test-app-secret-for-jwt-signing-12345';

describe('Auth API Integration Tests', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockReset();
    mockCreate.mockReset();
  });

  // Helper to create NextRequest with JSON body
  const createRequest = (body: object): NextRequest => {
    return new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'securePassword123';
      const userId = 'test-user-id-123';

      // Mock: No existing user found
      mockFindUnique.mockResolvedValue(null);

      // Mock: User creation
      mockCreate.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.token.split('.')).toHaveLength(3); // Valid JWT format
      expect(data.user).toEqual({
        id: userId,
        email: email.toLowerCase(),
      });

      // Verify Prisma calls
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: email.toLowerCase(),
          passwordHash: expect.any(String),
        }),
      });
    });

    it('should normalize email to lowercase', async () => {
      const email = 'TestUser@EXAMPLE.COM';
      const password = 'securePassword123';
      const userId = 'test-user-id-456';

      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.email).toBe('testuser@example.com');
    });

    it('should return 400 when email is missing', async () => {
      const request = createRequest({ password: 'securePassword123' });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const request = createRequest({ email: 'user@example.com' });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 400 when email and password are both missing', async () => {
      const request = createRequest({});
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 400 for invalid email format', async () => {
      const request = createRequest({
        email: 'invalid-email',
        password: 'securePassword123',
      });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email format');
    });

    it('should return 400 for email without domain', async () => {
      const request = createRequest({
        email: 'user@',
        password: 'securePassword123',
      });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid email format');
    });

    it('should return 400 when password is too short', async () => {
      const request = createRequest({
        email: 'user@example.com',
        password: 'short',
      });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password must be at least 8 characters long');
    });

    it('should return 400 when password is exactly 7 characters', async () => {
      const request = createRequest({
        email: 'user@example.com',
        password: '1234567',
      });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password must be at least 8 characters long');
    });

    it('should accept password with exactly 8 characters', async () => {
      const email = 'user@example.com';
      const password = '12345678';
      const userId = 'test-user-id-789';

      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await registerHandler(request);

      expect(response.status).toBe(200);
    });

    it('should return 409 when email already exists', async () => {
      const email = 'existing@example.com';
      const password = 'securePassword123';

      // Mock: User already exists
      mockFindUnique.mockResolvedValue({
        id: 'existing-user-id',
        email: email.toLowerCase(),
        passwordHash: 'existing-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('An account with this email already exists');

      // Should not attempt to create user
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return 409 for existing email with different case', async () => {
      const existingEmail = 'existing@example.com';
      const registrationEmail = 'EXISTING@EXAMPLE.COM';
      const password = 'securePassword123';

      // Mock: User exists with lowercase email
      mockFindUnique.mockResolvedValue({
        id: 'existing-user-id',
        email: existingEmail,
        passwordHash: 'existing-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email: registrationEmail, password });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('An account with this email already exists');
    });

    it('should return 500 when database error occurs during user lookup', async () => {
      mockFindUnique.mockRejectedValue(
        new Error('Database connection error')
      );

      const request = createRequest({
        email: 'user@example.com',
        password: 'securePassword123',
      });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create account');
    });

    it('should return 500 when database error occurs during user creation', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockRejectedValue(
        new Error('Database write error')
      );

      const request = createRequest({
        email: 'user@example.com',
        password: 'securePassword123',
      });
      const response = await registerHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create account');
    });
  });

  describe('POST /api/auth/login', () => {
    // Pre-hash a password for testing
    let testPasswordHash: string;

    beforeAll(async () => {
      testPasswordHash = await hashPassword('correctPassword123');
    });

    it('should login successfully with correct credentials', async () => {
      const email = 'user@example.com';
      const password = 'correctPassword123';
      const userId = 'user-id-abc';

      // Mock: User found
      mockFindUnique.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash: testPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.token.split('.')).toHaveLength(3); // Valid JWT format
      expect(data.user).toEqual({
        id: userId,
        email: email.toLowerCase(),
      });
    });

    it('should login with email in different case', async () => {
      const storedEmail = 'user@example.com';
      const loginEmail = 'USER@EXAMPLE.COM';
      const password = 'correctPassword123';
      const userId = 'user-id-abc';

      mockFindUnique.mockResolvedValue({
        id: userId,
        email: storedEmail,
        passwordHash: testPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email: loginEmail, password });
      const response = await loginHandler(request);

      expect(response.status).toBe(200);

      // Verify lookup was done with lowercase email
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: loginEmail.toLowerCase() },
      });
    });

    it('should return 400 when email is missing', async () => {
      const request = createRequest({ password: 'somePassword123' });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const request = createRequest({ email: 'user@example.com' });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 400 when both email and password are missing', async () => {
      const request = createRequest({});
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and password are required');
    });

    it('should return 401 when user is not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'somePassword123';

      // Mock: No user found
      mockFindUnique.mockResolvedValue(null);

      const request = createRequest({ email, password });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      // Generic error message for security (no user enumeration)
      expect(data.error).toBe('Invalid email or password');
    });

    it('should return 401 when password is wrong', async () => {
      const email = 'user@example.com';
      const correctPasswordHash = await hashPassword('correctPassword123');

      mockFindUnique.mockResolvedValue({
        id: 'user-id-123',
        email: email.toLowerCase(),
        passwordHash: correctPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password: 'wrongPassword456' });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      // Same generic error message for wrong password
      expect(data.error).toBe('Invalid email or password');
    });

    it('should return same error for non-existent user and wrong password (security)', async () => {
      // Test 1: Non-existent user
      mockFindUnique.mockResolvedValue(null);
      const request1 = createRequest({
        email: 'nonexistent@example.com',
        password: 'anyPassword123',
      });
      const response1 = await loginHandler(request1);
      const data1 = await response1.json();

      // Test 2: Wrong password
      const correctPasswordHash = await hashPassword('correctPassword');
      mockFindUnique.mockResolvedValue({
        id: 'user-id-123',
        email: 'existing@example.com',
        passwordHash: correctPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const request2 = createRequest({
        email: 'existing@example.com',
        password: 'wrongPassword',
      });
      const response2 = await loginHandler(request2);
      const data2 = await response2.json();

      // Both should return same status and error message
      expect(response1.status).toBe(response2.status);
      expect(data1.error).toBe(data2.error);
      expect(data1.error).toBe('Invalid email or password');
    });

    it('should return 500 when database error occurs', async () => {
      mockFindUnique.mockRejectedValue(
        new Error('Database connection error')
      );

      const request = createRequest({
        email: 'user@example.com',
        password: 'somePassword123',
      });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to login');
    });

    it('should handle special characters in password during login', async () => {
      const email = 'user@example.com';
      const password = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const passwordHash = await hashPassword(password);
      const userId = 'user-id-special';

      mockFindUnique.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(userId);
    });

    it('should handle unicode characters in password during login', async () => {
      const email = 'user@example.com';
      const password = '日本語パスワード🔐';
      const passwordHash = await hashPassword(password);
      const userId = 'user-id-unicode';

      mockFindUnique.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await loginHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(userId);
    });
  });

  describe('JWT token validation in responses', () => {
    it('should return a JWT that can be verified after registration', async () => {
      const email = 'jwttest@example.com';
      const password = 'securePassword123';
      const userId = 'jwt-test-user-id';

      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await registerHandler(request);
      const data = await response.json();

      // Import verifyToken to check the token
      const { verifyToken } = await import('@/lib/auth');
      const decoded = verifyToken(data.token);

      expect(decoded).toEqual({ userId });
    });

    it('should return a JWT that can be verified after login', async () => {
      const email = 'jwtlogin@example.com';
      const password = 'securePassword123';
      const passwordHash = await hashPassword(password);
      const userId = 'jwt-login-user-id';

      mockFindUnique.mockResolvedValue({
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = createRequest({ email, password });
      const response = await loginHandler(request);
      const data = await response.json();

      const { verifyToken } = await import('@/lib/auth');
      const decoded = verifyToken(data.token);

      expect(decoded).toEqual({ userId });
    });
  });
});
