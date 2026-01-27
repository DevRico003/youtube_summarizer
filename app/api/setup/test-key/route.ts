import { NextRequest, NextResponse } from "next/server";
import { Supadata } from "@supadata/js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service, apiKey } = body;

    if (!service || !apiKey) {
      return NextResponse.json(
        { error: "Service and apiKey are required" },
        { status: 400 }
      );
    }

    if (service === "supadata") {
      // Test Supadata API key by making a simple API call
      const supadata = new Supadata({
        apiKey: apiKey,
      });

      // Try to get a transcript from a well-known short video to validate the key
      // Using a short YouTube video for quick validation
      try {
        const result = await supadata.youtube.transcript({
          url: "https://www.youtube.com/watch?v=jNQXAC9IVRw", // "Me at the zoo" - first YouTube video, very short
        });

        // If we get here without error, the key is valid
        return NextResponse.json({
          success: true,
          message: "Supadata API key is valid",
        });
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error";
        // Check if it's an auth error
        if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("invalid")) {
          return NextResponse.json(
            { success: false, error: "Invalid API key" },
            { status: 401 }
          );
        }
        // Other errors might be network issues but key could still be valid
        return NextResponse.json(
          { success: false, error: `API test failed: ${errorMessage}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: `Unsupported service: ${service}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error testing API key:", error);
    return NextResponse.json(
      { error: "Failed to test API key" },
      { status: 500 }
    );
  }
}
