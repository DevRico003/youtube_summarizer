import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get the JWT secret from environment variable
 */
function getJwtSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(userId: string): string {
  const secret = getJwtSecret();
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

/**
 * Verify a JWT token and return the payload
 * Returns null if token is invalid or expired
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as { userId: string };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
