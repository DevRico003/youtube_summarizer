import OpenAI from "openai";
import {
  getGlmCodingClient,
  getGlmPaasClient,
  isGlmConfigured,
} from "./glm";

/**
 * Model identifiers for the fallback chain
 */
export type ModelId = "glm-4.7";

/**
 * Provider group type
 */
export type ProviderGroup = "zai";

/**
 * Model to provider group mapping
 */
const MODEL_GROUPS: Record<ModelId, ProviderGroup> = {
  "glm-4.7": "zai",
};

/**
 * Model information type
 */
export interface ModelInfo {
  id: ModelId;
  name: string;
  available: boolean;
  group: ProviderGroup;
}

/**
 * Response from the LLM call
 */
export interface LlmResponse {
  response: string;
  modelUsed: ModelId;
  tokensUsed?: number;
}

/**
 * Options for the LLM call
 */
export interface LlmCallOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  preferredModel?: ModelId;
  userId?: string;
}

/**
 * Gets all models and their availability status for a specific user.
 *
 * @param userId - The user's ID to check their configured API keys
 * @returns Promise<ModelInfo[]> - Array of model info with availability
 */
export async function getAvailableModels(userId: string): Promise<ModelInfo[]> {
  const glmAvailable = await isGlmConfigured(userId);

  return [
    { id: "glm-4.7", name: "GLM-4.7", available: glmAvailable, group: "zai" as ProviderGroup },
  ];
}

/**
 * Calls an LLM with automatic fallback to other models if primary fails.
 *
 * @param prompt - The user prompt to send
 * @param options - Optional configuration for the call (must include userId)
 * @returns Promise<LlmResponse> - The response and model used
 * @throws Error if all models fail or userId is not provided
 */
export async function callWithFallback(
  prompt: string,
  options: LlmCallOptions = {}
): Promise<LlmResponse> {
  const { maxTokens = 4096, temperature = 0.7, systemPrompt, userId } = options;

  if (!userId) {
    throw new Error("userId is required for LLM calls");
  }

  const errors: { model: ModelId; error: string }[] = [];

  // Build the model order - only GLM-4.7 available
  const preferredModel = options.preferredModel || "glm-4.7";
  const group = MODEL_GROUPS[preferredModel];

  // Get all models in the same group for fallback
  const groupModels = Object.entries(MODEL_GROUPS)
    .filter(([, g]) => g === group)
    .map(([id]) => id as ModelId);

  // Build order: preferred first, then other models in same group
  const modelOrder: ModelId[] = [
    preferredModel,
    ...groupModels.filter((m) => m !== preferredModel),
  ];

  // Try each model in order
  for (const modelId of modelOrder) {
    try {
      const result = await callModel(modelId, prompt, {
        maxTokens,
        temperature,
        systemPrompt,
        userId,
      });
      if (result) {
        return result;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push({ model: modelId, error: errorMessage });
      console.warn(`Model ${modelId} failed:`, errorMessage);
    }
  }

  // All models failed
  throw new Error(
    `All models failed. Errors: ${errors
      .map((e) => `${e.model}: ${e.error}`)
      .join("; ")}`
  );
}

/**
 * Calls a specific model.
 * Returns null if model is not configured.
 */
async function callModel(
  modelId: ModelId,
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string; userId: string }
): Promise<LlmResponse | null> {
  switch (modelId) {
    case "glm-4.7":
      return callGlm(prompt, options);
    default:
      return null;
  }
}

/**
 * Call GLM-4.7
 * Tries Coding Subscription first (Anthropic format), falls back to PAAS (OpenAI format)
 */
async function callGlm(
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string; userId: string }
): Promise<LlmResponse | null> {
  const apiModelName = "glm-4.7";

  // Try Coding Subscription first (uses Anthropic format)
  try {
    const codingClient = await getGlmCodingClient(options.userId);
    if (codingClient) {
      const response = await codingClient.messages.create({
        model: apiModelName,
        max_tokens: options.maxTokens,
        system: options.systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (textBlock && textBlock.type === "text") {
        return {
          response: textBlock.text,
          modelUsed: "glm-4.7",
          tokensUsed:
            response.usage.input_tokens + response.usage.output_tokens,
        };
      }
    }
  } catch (error) {
    // Log and fall through to PAAS
    console.warn(
      "GLM Coding Subscription failed, trying PAAS:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Fallback to PAAS API (uses OpenAI format)
  const paasClient = await getGlmPaasClient(options.userId);
  if (!paasClient) return null;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await paasClient.chat.completions.create({
    model: apiModelName,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in GLM response");
  }

  return {
    response: content,
    modelUsed: "glm-4.7",
    tokensUsed: completion.usage?.total_tokens,
  };
}
