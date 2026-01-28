import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/apiAuth";
import { getUserApiKeys } from "@/lib/userConfig";

/**
 * GET - Check if any LLM provider is configured for the user
 * Used by middleware and setup page to determine if setup is needed
 */
export async function GET(request: NextRequest) {
  // Authenticate request
  const auth = authenticateRequest(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    // Check which services the user has configured
    const userKeys = await getUserApiKeys(auth.userId);

    const hasAnyLlmProvider = !!(
      userKeys.zai || userKeys.openrouter || userKeys.gemini || userKeys.groq || userKeys.openai
    );

    return NextResponse.json({
      needsSetup: !hasAnyLlmProvider,
      providers: {
        zai: userKeys.zai,
        openrouter: userKeys.openrouter,
        gemini: userKeys.gemini,
        groq: userKeys.groq,
        openai: userKeys.openai,
      },
    });
  } catch (error) {
    console.error("Error checking setup status:", error);
    // If there's an error checking status, assume setup is needed
    return NextResponse.json({
      needsSetup: true,
      providers: {
        zai: false,
        openrouter: false,
        gemini: false,
        groq: false,
        openai: false,
      },
    });
  }
}
