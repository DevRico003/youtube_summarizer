import { NextRequest, NextResponse } from "next/server";
import { setConfig, hasAppSecret } from "@/lib/appConfig";

// Config keys for different services
const CONFIG_KEYS: Record<string, string> = {
  supadata: "SUPADATA_API_KEY",
  zai: "ZAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openai: "OPENAI_API_KEY",
};

export async function POST(request: NextRequest) {
  try {
    // Check if APP_SECRET is configured
    if (!hasAppSecret()) {
      return NextResponse.json(
        { error: "APP_SECRET is not configured. Please complete Step 1 first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { service, apiKey } = body;

    if (!service) {
      return NextResponse.json(
        { error: "Service is required" },
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

    // If apiKey is empty or not provided, we're skipping (don't save anything)
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({
        success: true,
        message: `Skipped ${service} API key configuration`,
        skipped: true,
      });
    }

    // Save the encrypted API key to the database
    await setConfig(configKey, apiKey.trim());

    return NextResponse.json({
      success: true,
      message: `${service} API key saved successfully`,
    });
  } catch (error) {
    console.error("Error saving API key:", error);
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}
