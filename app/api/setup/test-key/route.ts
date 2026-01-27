import { NextRequest, NextResponse } from "next/server";
import { Supadata } from "@supadata/js";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

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

    if (service === "zai") {
      // Test Z.AI API key by making a simple completion request
      const client = new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.z.ai/api/paas/v4/",
      });

      try {
        // Make a minimal test request to validate the key
        const completion = await client.chat.completions.create({
          model: "glm-4.7",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5,
        });

        // If we get here without error, the key is valid
        return NextResponse.json({
          success: true,
          message: "Z.AI API key is valid",
        });
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error";
        // Check if it's an auth error
        if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("invalid") || errorMessage.includes("Incorrect API key")) {
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

    if (service === "gemini") {
      // Test Gemini API key by making a simple content generation request
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      try {
        // Make a minimal test request to validate the key
        await model.generateContent("Hello");

        // If we get here without error, the key is valid
        return NextResponse.json({
          success: true,
          message: "Gemini API key is valid",
        });
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error";
        // Check if it's an auth error
        if (errorMessage.includes("401") || errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("invalid")) {
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

    if (service === "groq") {
      // Test Groq API key by making a simple completion request
      const groq = new Groq({ apiKey });

      try {
        // Make a minimal test request to validate the key
        await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5,
        });

        // If we get here without error, the key is valid
        return NextResponse.json({
          success: true,
          message: "Groq API key is valid",
        });
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error";
        // Check if it's an auth error
        if (errorMessage.includes("401") || errorMessage.includes("invalid_api_key") || errorMessage.includes("Invalid API Key")) {
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

    if (service === "openai") {
      // Test OpenAI API key by making a simple completion request
      const openai = new OpenAI({ apiKey });

      try {
        // Make a minimal test request to validate the key
        await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 5,
        });

        // If we get here without error, the key is valid
        return NextResponse.json({
          success: true,
          message: "OpenAI API key is valid",
        });
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : "Unknown error";
        // Check if it's an auth error
        if (errorMessage.includes("401") || errorMessage.includes("Incorrect API key") || errorMessage.includes("invalid_api_key")) {
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
