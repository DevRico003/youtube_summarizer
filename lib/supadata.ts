import { Supadata } from "@supadata/js";
import { getUserApiKey } from "./userConfig";

/**
 * Cache of Supadata clients per user
 */
const supadataClients: Map<string, Supadata> = new Map();

/**
 * Gets or creates a Supadata client instance for a specific user
 * @param userId - The user's ID
 * @returns Promise<Supadata | null> - The Supadata client, or null if API key is not configured
 */
export async function getSupadataClient(userId?: string): Promise<Supadata | null> {
  if (!userId) {
    console.warn("Supadata API key not configured - no userId provided");
    return null;
  }

  // Return cached instance if available for this user
  const cached = supadataClients.get(userId);
  if (cached) {
    return cached;
  }

  // Get API key from user's configured keys
  const apiKey = await getUserApiKey(userId, "supadata");

  // Handle missing API key gracefully
  if (!apiKey) {
    console.warn("Supadata API key not configured");
    return null;
  }

  // Initialize and cache the client for this user
  const client = new Supadata({
    apiKey: apiKey,
  });
  supadataClients.set(userId, client);

  return client;
}

/**
 * Clears the cached Supadata client instance for a user
 * Useful when API key is updated
 * @param userId - The user's ID (if not provided, clears all)
 */
export function clearSupadataClient(userId?: string): void {
  if (userId) {
    supadataClients.delete(userId);
  } else {
    supadataClients.clear();
  }
}

/**
 * Checks if Supadata is configured and available for a user
 * @param userId - The user's ID
 * @returns Promise<boolean> - true if Supadata API key is configured
 */
export async function isSupadataConfigured(userId?: string): Promise<boolean> {
  if (!userId) {
    return false;
  }
  const apiKey = await getUserApiKey(userId, "supadata");
  return apiKey !== null && apiKey.length > 0;
}
