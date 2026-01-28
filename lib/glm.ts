import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { getUserApiKey } from "./userConfig";

/**
 * GLM-4.7 client configuration
 *
 * Two endpoints are available:
 * 1. Coding Subscription (primary): https://api.z.ai/api/anthropic - uses Anthropic format
 * 2. Standard API (fallback): https://api.z.ai/api/paas/v4/ - uses OpenAI format
 */
const GLM_CODING_URL = "https://api.z.ai/api/anthropic";
const GLM_PAAS_URL = "https://api.z.ai/api/paas/v4/";
const GLM_MODEL = "glm-4.7";

/**
 * Per-user client cache to avoid recreating clients
 */
const glmCodingClients: Map<string, Anthropic> = new Map();
const glmPaasClients: Map<string, OpenAI> = new Map();

/**
 * Gets or creates a GLM-4.7 client using the Coding Subscription (Anthropic format).
 * This is the primary client that uses the coding subscription quota.
 *
 * @param userId - The user's ID to fetch their API key
 * @returns Promise<Anthropic | null> - The GLM Coding client, or null if API key is not configured
 */
export async function getGlmCodingClient(userId: string): Promise<Anthropic | null> {
  const cached = glmCodingClients.get(userId);
  if (cached) {
    return cached;
  }

  const apiKey = await getUserApiKey(userId, "zai");
  if (!apiKey) {
    return null;
  }

  const client = new Anthropic({
    apiKey: apiKey,
    baseURL: GLM_CODING_URL,
  });

  glmCodingClients.set(userId, client);
  return client;
}

/**
 * Gets or creates a GLM-4.7 client using the standard PAAS API (OpenAI format).
 * This is the fallback client that uses the pay-as-you-go quota.
 *
 * @param userId - The user's ID to fetch their API key
 * @returns Promise<OpenAI | null> - The GLM PAAS client, or null if API key is not configured
 */
export async function getGlmPaasClient(userId: string): Promise<OpenAI | null> {
  const cached = glmPaasClients.get(userId);
  if (cached) {
    return cached;
  }

  const apiKey = await getUserApiKey(userId, "zai");
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: GLM_PAAS_URL,
  });

  glmPaasClients.set(userId, client);
  return client;
}

/**
 * Legacy function - returns the PAAS client for backward compatibility.
 * @deprecated Use getGlmCodingClient() for coding subscription or getGlmPaasClient() for PAAS
 */
export async function getGlmClient(userId: string): Promise<OpenAI | null> {
  return getGlmPaasClient(userId);
}

/**
 * Clears the cached GLM client instances for a specific user.
 * Useful when API key is updated.
 *
 * @param userId - The user's ID
 */
export function clearGlmClient(userId: string): void {
  glmCodingClients.delete(userId);
  glmPaasClients.delete(userId);
}

/**
 * Checks if GLM-4.7 is configured and available for a user.
 *
 * @param userId - The user's ID
 * @returns Promise<boolean> - true if Z.AI API key is configured
 */
export async function isGlmConfigured(userId: string): Promise<boolean> {
  const apiKey = await getUserApiKey(userId, "zai");
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
