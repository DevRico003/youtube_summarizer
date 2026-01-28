import { prisma } from "./prisma";
import { encrypt, decrypt } from "./encryption";

/**
 * Gets the APP_SECRET from environment variables
 * @throws Error if APP_SECRET is not configured
 */
function getAppSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET environment variable is not configured");
  }
  return secret;
}

/**
 * Gets a user's API key for a specific service
 *
 * @param userId - The user's ID
 * @param service - The service name (e.g., "supadata", "zai")
 * @returns The decrypted API key, or null if not found
 */
export async function getUserApiKey(
  userId: string,
  service: string
): Promise<string | null> {
  const secret = getAppSecret();

  const apiKey = await prisma.userApiKey.findUnique({
    where: {
      userId_service: {
        userId,
        service,
      },
    },
  });

  if (!apiKey) {
    return null;
  }

  try {
    return decrypt(apiKey.encryptedValue, secret);
  } catch (error) {
    console.error(`Failed to decrypt API key for user ${userId}, service ${service}:`, error);
    return null;
  }
}

/**
 * Sets (creates or updates) a user's API key for a specific service
 *
 * @param userId - The user's ID
 * @param service - The service name
 * @param value - The plaintext API key to encrypt and store
 */
export async function setUserApiKey(
  userId: string,
  service: string,
  value: string
): Promise<void> {
  const secret = getAppSecret();
  const encryptedValue = encrypt(value, secret);

  await prisma.userApiKey.upsert({
    where: {
      userId_service: {
        userId,
        service,
      },
    },
    update: { encryptedValue },
    create: {
      userId,
      service,
      encryptedValue,
    },
  });
}

/**
 * Deletes a user's API key for a specific service
 *
 * @param userId - The user's ID
 * @param service - The service name
 */
export async function deleteUserApiKey(
  userId: string,
  service: string
): Promise<void> {
  await prisma.userApiKey
    .delete({
      where: {
        userId_service: {
          userId,
          service,
        },
      },
    })
    .catch(() => {
      // Ignore error if key doesn't exist
    });
}

/**
 * Gets a map of all configured services for a user
 *
 * @param userId - The user's ID
 * @returns Record of service names to boolean (true if configured)
 */
export async function getUserApiKeys(
  userId: string
): Promise<Record<string, boolean>> {
  const apiKeys = await prisma.userApiKey.findMany({
    where: { userId },
    select: { service: true },
  });

  const result: Record<string, boolean> = {
    supadata: false,
    zai: false,
  };

  for (const key of apiKeys) {
    result[key.service] = true;
  }

  return result;
}

/**
 * Gets all API keys for a user with masked values
 *
 * @param userId - The user's ID
 * @returns Record of service names to their status and masked values
 */
export async function getUserApiKeysWithMasked(
  userId: string
): Promise<Record<string, { configured: boolean; masked: string | null }>> {
  const secret = getAppSecret();

  const apiKeys = await prisma.userApiKey.findMany({
    where: { userId },
  });

  const result: Record<string, { configured: boolean; masked: string | null }> = {
    supadata: { configured: false, masked: null },
    zai: { configured: false, masked: null },
  };

  for (const apiKey of apiKeys) {
    try {
      const decrypted = decrypt(apiKey.encryptedValue, secret);
      result[apiKey.service] = {
        configured: true,
        masked: maskApiKey(decrypted),
      };
    } catch {
      // If decryption fails, mark as not configured
      result[apiKey.service] = { configured: false, masked: null };
    }
  }

  return result;
}

/**
 * Masks an API key showing only last 4 characters
 */
function maskApiKey(key: string): string {
  if (key.length <= 4) {
    return "****";
  }
  return "•".repeat(Math.min(key.length - 4, 20)) + key.slice(-4);
}
