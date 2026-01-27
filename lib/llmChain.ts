import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { getConfig } from "./appConfig";
import { getGlmClient, getGlmModelName, isGlmConfigured } from "./glm";

/**
 * Model identifiers for the fallback chain
 */
export type ModelId = "glm-4.7" | "gemini" | "groq" | "openai";

/**
 * Model information type
 */
export interface ModelInfo {
  id: ModelId;
  name: string;
  available: boolean;
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
}

/**
 * Gets all models and their availability status.
 *
 * @returns Promise<ModelInfo[]> - Array of model info with availability
 */
export async function getAvailableModels(): Promise<ModelInfo[]> {
  const [glmAvailable, geminiAvailable, groqAvailable, openaiAvailable] =
    await Promise.all([
      isGlmConfigured(),
      isGeminiConfigured(),
      isGroqConfigured(),
      isOpenAIConfigured(),
    ]);

  return [
    { id: "glm-4.7", name: "GLM-4.7 (Z.AI)", available: glmAvailable },
    { id: "gemini", name: "Gemini 1.5 Flash", available: geminiAvailable },
    { id: "groq", name: "Llama 3.1 (Groq)", available: groqAvailable },
    { id: "openai", name: "GPT-4o Mini", available: openaiAvailable },
  ];
}

/**
 * Calls an LLM with automatic fallback to other models if primary fails.
 * Order: GLM-4.7 → Gemini → Groq → OpenAI
 *
 * @param prompt - The user prompt to send
 * @param options - Optional configuration for the call
 * @returns Promise<LlmResponse> - The response and model used
 * @throws Error if all models fail
 */
export async function callWithFallback(
  prompt: string,
  options: LlmCallOptions = {}
): Promise<LlmResponse> {
  const { maxTokens = 4096, temperature = 0.7, systemPrompt } = options;

  const errors: { model: ModelId; error: string }[] = [];

  // Build the model order (preferred first, then default order)
  const modelOrder: ModelId[] = options.preferredModel
    ? [
        options.preferredModel,
        ...["glm-4.7", "gemini", "groq", "openai"].filter(
          (m) => m !== options.preferredModel
        ) as ModelId[],
      ]
    : ["glm-4.7", "gemini", "groq", "openai"];

  // Try each model in order
  for (const modelId of modelOrder) {
    try {
      const result = await callModel(modelId, prompt, {
        maxTokens,
        temperature,
        systemPrompt,
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
  options: { maxTokens: number; temperature: number; systemPrompt?: string }
): Promise<LlmResponse | null> {
  switch (modelId) {
    case "glm-4.7":
      return callGlm(prompt, options);
    case "gemini":
      return callGemini(prompt, options);
    case "groq":
      return callGroq(prompt, options);
    case "openai":
      return callOpenAI(prompt, options);
    default:
      return null;
  }
}

/**
 * Call GLM-4.7
 */
async function callGlm(
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string }
): Promise<LlmResponse | null> {
  const client = await getGlmClient();
  if (!client) return null;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: getGlmModelName(),
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

/**
 * Call Gemini
 */
async function callGemini(
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string }
): Promise<LlmResponse | null> {
  const apiKey = await getConfig("GEMINI_API_KEY");
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use type assertion to pass generationConfig which is supported by BaseParams
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const fullPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${prompt}`
    : prompt;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;
  const content = response.text();

  if (!content) {
    throw new Error("No content in Gemini response");
  }

  // Cast to access usageMetadata which exists on GenerateContentResponse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usageMetadata = (response as any).usageMetadata;

  return {
    response: content,
    modelUsed: "gemini",
    tokensUsed: usageMetadata?.totalTokenCount,
  };
}

/**
 * Call Groq
 */
async function callGroq(
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string }
): Promise<LlmResponse | null> {
  const apiKey = await getConfig("GROQ_API_KEY");
  if (!apiKey) return null;

  const groq = new Groq({ apiKey });

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in Groq response");
  }

  return {
    response: content,
    modelUsed: "groq",
    tokensUsed: completion.usage?.total_tokens,
  };
}

/**
 * Call OpenAI
 */
async function callOpenAI(
  prompt: string,
  options: { maxTokens: number; temperature: number; systemPrompt?: string }
): Promise<LlmResponse | null> {
  const apiKey = await getConfig("OPENAI_API_KEY");
  if (!apiKey) return null;

  const openai = new OpenAI({ apiKey });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return {
    response: content,
    modelUsed: "openai",
    tokensUsed: completion.usage?.total_tokens,
  };
}

/**
 * Check if Gemini is configured
 */
async function isGeminiConfigured(): Promise<boolean> {
  const apiKey = await getConfig("GEMINI_API_KEY");
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Check if Groq is configured
 */
async function isGroqConfigured(): Promise<boolean> {
  const apiKey = await getConfig("GROQ_API_KEY");
  return apiKey !== null && apiKey.length > 0;
}

/**
 * Check if OpenAI is configured
 */
async function isOpenAIConfigured(): Promise<boolean> {
  const apiKey = await getConfig("OPENAI_API_KEY");
  return apiKey !== null && apiKey.length > 0;
}
