import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/apiAuth";
import { getUserApiKeysWithMasked, deleteUserApiKey } from "@/lib/userConfig";
import { clearGlmClient } from "@/lib/glm";

const SERVICE_NAMES: Record<string, string> = {
  supadata: "Supadata",
  zai: "Z.AI (GLM-4.7)",
};

const VALID_SERVICES = ["supadata", "zai"];

/**
 * GET - Retrieve status of all API keys (masked) for the user
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const userKeys = await getUserApiKeysWithMasked(auth.userId);

    const keys: Record<string, { configured: boolean; masked: string | null; displayName: string }> = {};

    for (const service of VALID_SERVICES) {
      keys[service] = {
        configured: userKeys[service]?.configured ?? false,
        masked: userKeys[service]?.masked ?? null,
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
 * DELETE - Remove an API key for the user
 */
export async function DELETE(request: NextRequest) {
  // Authenticate request
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return auth.response;
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

    if (!VALID_SERVICES.includes(service)) {
      return NextResponse.json(
        { error: `Unsupported service: ${service}` },
        { status: 400 }
      );
    }

    await deleteUserApiKey(auth.userId, service);

    // Clear cached clients so they pick up the removal
    if (service === "zai") {
      clearGlmClient(auth.userId);
    }

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
