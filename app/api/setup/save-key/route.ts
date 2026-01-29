import { NextRequest, NextResponse } from "next/server";
import { hasAppSecret } from "@/lib/appConfig";
import { authenticateRequest } from "@/lib/apiAuth";
import { setUserApiKey } from "@/lib/userConfig";
import { clearGlmClient } from "@/lib/glm";
import { clearSupadataClient } from "@/lib/supadata";

// Valid service names
const VALID_SERVICES = ["supadata", "zai"];

export async function POST(request: NextRequest) {
  try {
    // Check if APP_SECRET is configured
    if (!hasAppSecret()) {
      return NextResponse.json(
        { error: "APP_SECRET is not configured. Please complete Step 1 first." },
        { status: 400 }
      );
    }

    // Authenticate request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const { service, apiKey } = body;

    if (!service) {
      return NextResponse.json(
        { error: "Service is required" },
        { status: 400 }
      );
    }

    if (!VALID_SERVICES.includes(service)) {
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

    // Save the encrypted API key to the user's database record
    await setUserApiKey(auth.userId, service, apiKey.trim());

    // Clear cached clients so they pick up the new key
    if (service === "supadata") {
      clearSupadataClient(auth.userId);
    } else if (service === "zai") {
      clearGlmClient(auth.userId);
    }

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
