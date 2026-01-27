import OpenAI from "openai";
import { getConfig } from "./appConfig";

/**
 * GLM-4.7 client configuration
 */
const GLM_BASE_URL = "https://api.z.ai/api/paas/v4/";
const GLM_MODEL = "glm-4.7";

/**
 * Singleton instance of the GLM client
 */
let glmClient: OpenAI | null = null;

/**
 * Gets or creates a GLM-4.7 client instance using the OpenAI SDK.
 * GLM-4.7 is the primary LLM model for this application.
 *
 * @returns Promise<OpenAI | null> - The GLM client, or null if API key is not configured
 */
export async function getGlmClient(): Promise<OpenAI | null> {
  // Return cached instance if available
  if (glmClient) {
    return glmClient;
  }

  // Get API key from AppConfig
  const apiKey = await getConfig("ZAI_API_KEY");

  // Handle missing API key gracefully
  if (!apiKey) {
    console.warn("Z.AI API key not configured");
    return null;
  }

  // Initialize and cache the client
  glmClient = new OpenAI({
    apiKey: apiKey,
    baseURL: GLM_BASE_URL,
  });

  return glmClient;
}

/**
 * Clears the cached GLM client instance.
 * Useful when API key is updated.
 */
export function clearGlmClient(): void {
  glmClient = null;
}

/**
 * Checks if GLM-4.7 is configured and available.
 *
 * @returns Promise<boolean> - true if Z.AI API key is configured
 */
export async function isGlmConfigured(): Promise<boolean> {
  const apiKey = await getConfig("ZAI_API_KEY");
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Gets the GLM model name to use for API calls.
 *
 * @returns The GLM model identifier
 */
export function getGlmModelName(): string {
  return GLM_MODEL;
}
