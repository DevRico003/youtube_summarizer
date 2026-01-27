import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Extract and verify JWT token from Authorization header
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * GET /api/preferences
 * Returns user's preferences, creating defaults on first access
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get or create user preferences (upsert pattern)
    let preferences = await prisma.userPreference.findUnique({
      where: { userId },
    });

    // Create default preferences on first access
    if (!preferences) {
      preferences = await prisma.userPreference.create({
        data: {
          userId,
          language: "en",
          detailLevel: 3,
          preferredModel: "glm-4.7",
          customPrompt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        language: preferences.language,
        detailLevel: preferences.detailLevel,
        preferredModel: preferences.preferredModel,
        customPrompt: preferences.customPrompt,
      },
    });
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/preferences
 * Update user's preferences
 * Body: { language?, detailLevel?, preferredModel?, customPrompt? }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { language, detailLevel, preferredModel, customPrompt } = body as {
      language?: string;
      detailLevel?: number;
      preferredModel?: string;
      customPrompt?: string | null;
    };

    // Validate detailLevel if provided
    if (detailLevel !== undefined) {
      if (typeof detailLevel !== "number" || detailLevel < 1 || detailLevel > 5) {
        return NextResponse.json(
          { error: "detailLevel must be a number between 1 and 5" },
          { status: 400 }
        );
      }
    }

    // Build update data object with only provided fields
    const updateData: {
      language?: string;
      detailLevel?: number;
      preferredModel?: string;
      customPrompt?: string | null;
    } = {};

    if (language !== undefined) updateData.language = language;
    if (detailLevel !== undefined) updateData.detailLevel = detailLevel;
    if (preferredModel !== undefined) updateData.preferredModel = preferredModel;
    if (customPrompt !== undefined) updateData.customPrompt = customPrompt;

    // Upsert preferences (create if not exists, update if exists)
    const preferences = await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        language: language ?? "en",
        detailLevel: detailLevel ?? 3,
        preferredModel: preferredModel ?? "glm-4.7",
        customPrompt: customPrompt ?? null,
      },
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      preferences: {
        language: preferences.language,
        detailLevel: preferences.detailLevel,
        preferredModel: preferences.preferredModel,
        customPrompt: preferences.customPrompt,
      },
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/preferences
 * Alias for POST - update user's preferences
 */
export async function PUT(request: NextRequest) {
  return POST(request);
}
