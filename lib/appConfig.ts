import { prisma } from './prisma';
import { encrypt, decrypt } from './encryption';

/**
 * Gets the APP_SECRET from environment variables
 * @throws Error if APP_SECRET is not configured
 */
function getAppSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET environment variable is not configured');
  }
  return secret;
}

/**
 * Checks if the APP_SECRET environment variable is configured
 * @returns true if APP_SECRET exists and is not empty
 */
export function hasAppSecret(): boolean {
  const secret = process.env.APP_SECRET;
  return !!secret && secret.length > 0;
}

/**
 * Gets a decrypted config value from the database
 * @param key - The config key to retrieve
 * @returns The decrypted value, or null if not found
 */
export async function getConfig(key: string): Promise<string | null> {
  const secret = getAppSecret();

  const config = await prisma.appConfig.findUnique({
    where: { key },
  });

  if (!config) {
    return null;
  }

  try {
    return decrypt(config.encryptedValue, secret);
  } catch (error) {
    console.error(`Failed to decrypt config value for key: ${key}`, error);
    return null;
  }
}

/**
 * Sets an encrypted config value in the database
 * @param key - The config key to store
 * @param value - The plaintext value to encrypt and store
 */
export async function setConfig(key: string, value: string): Promise<void> {
  const secret = getAppSecret();
  const encryptedValue = encrypt(value, secret);

  await prisma.appConfig.upsert({
    where: { key },
    update: { encryptedValue },
    create: { key, encryptedValue },
  });
}

/**
 * Deletes a config value from the database
 * @param key - The config key to delete
 */
export async function deleteConfig(key: string): Promise<void> {
  await prisma.appConfig.delete({
    where: { key },
  }).catch(() => {
    // Ignore error if key doesn't exist
  });
}
