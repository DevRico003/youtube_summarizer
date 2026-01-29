import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/apiAuth";

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const { userId, session } = authResult;

    // Update user's setupCompleted status
    const user = await prisma.user.update({
      where: { id: userId },
      data: { setupCompleted: true },
      select: {
        id: true,
        email: true,
        setupCompleted: true,
      },
    });

    // Also update the current session to reflect the new setupCompleted status
    // This ensures the client gets the updated value immediately (bypasses cookie cache)
    if (session?.session?.id) {
      await prisma.session.update({
        where: { id: session.session.id },
        data: {
          setupCompleted: true,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      user,
      // Signal client to refresh session
      refreshSession: true,
    });
  } catch (error) {
    console.error("Setup complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete setup" },
      { status: 500 }
    );
  }
}
