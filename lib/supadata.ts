import { Supadata } from "@supadata/js";
import { getConfig } from "./appConfig";

/**
 * Singleton instance of the Supadata client
 */
let supadataClient: Supadata | null = null;

/**
 * Gets or creates a Supadata client instance
 * @returns Promise<Supadata | null> - The Supadata client, or null if API key is not configured
 */
export async function getSupadataClient(): Promise<Supadata | null> {
  // Return cached instance if available
  if (supadataClient) {
    return supadataClient;
  }

  // Get API key from AppConfig
  const apiKey = await getConfig("SUPADATA_API_KEY");

  // Handle missing API key gracefully
  if (!apiKey) {
    console.warn("Supadata API key not configured");
    return null;
  }

  // Initialize and cache the client
  supadataClient = new Supadata({
    apiKey: apiKey,
  });

  return supadataClient;
}

/**
 * Clears the cached Supadata client instance
 * Useful when API key is updated
 */
export function clearSupadataClient(): void {
  supadataClient = null;
}

/**
 * Checks if Supadata is configured and available
 * @returns Promise<boolean> - true if Supadata API key is configured
 */
export async function isSupadataConfigured(): Promise<boolean> {
  const apiKey = await getConfig("SUPADATA_API_KEY");
  return apiKey !== null && apiKey.length > 0;
}
