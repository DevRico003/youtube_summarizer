import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";

/**
 * GET /api/user/setup-status
 * Returns the user's setupCompleted status directly from the database
 * This bypasses any caching issues with better-auth session
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId } = authResult;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { setupCompleted: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      setupCompleted: user.setupCompleted,
    });
  } catch (error) {
    console.error("Setup status error:", error);
    return NextResponse.json(
      { error: "Failed to get setup status" },
      { status: 500 }
    );
  }
}
