import { NextRequest, NextResponse } from "next/server";
import { getConfig, deleteConfig } from "@/lib/appConfig";
import { verifyToken } from "@/lib/auth";

// Config keys for different services
const CONFIG_KEYS: Record<string, string> = {
  supadata: "SUPADATA_API_KEY",
  zai: "ZAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openai: "OPENAI_API_KEY",
};

const SERVICE_NAMES: Record<string, string> = {
  supadata: "Supadata",
  zai: "Z.AI (GLM-4.7)",
  gemini: "Google Gemini",
  groq: "Groq",
  openai: "OpenAI",
};

/**
 * Get user ID from Authorization header
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Mask an API key showing only last 4 characters
 */
function maskApiKey(key: string): string {
  if (key.length <= 4) {
    return "****";
  }
  return "•".repeat(Math.min(key.length - 4, 20)) + key.slice(-4);
}

/**
 * GET - Retrieve status of all API keys (masked)
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const keys: Record<string, { configured: boolean; masked: string | null; displayName: string }> = {};

    for (const [service, configKey] of Object.entries(CONFIG_KEYS)) {
      const value = await getConfig(configKey);
      keys[service] = {
        configured: !!value,
        masked: value ? maskApiKey(value) : null,
        displayName: SERVICE_NAMES[service] || service,
      };
    }

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove an API key
 */
export async function DELETE(request: NextRequest) {
  // Verify authentication
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get("service");

    if (!service) {
      return NextResponse.json(
        { error: "Service parameter is required" },
        { status: 400 }
      );
    }

    const configKey = CONFIG_KEYS[service];
    if (!configKey) {
      return NextResponse.json(
        { error: `Unsupported service: ${service}` },
        { status: 400 }
      );
    }

    await deleteConfig(configKey);

    return NextResponse.json({
      success: true,
      message: `${SERVICE_NAMES[service]} API key deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
