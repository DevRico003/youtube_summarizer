import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

interface TopicEdit {
  topicId: string;
  customTitle?: string;
  customStartMs?: number;
  customEndMs?: number;
}

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
 * GET /api/topics/edit?summaryId={summaryId}
 * Returns user's custom topics for a summary, or original topics if no edits exist
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

    const { searchParams } = new URL(request.url);
    const summaryId = searchParams.get("summaryId");

    if (!summaryId) {
      return NextResponse.json(
        { error: "summaryId is required" },
        { status: 400 }
      );
    }

    // Verify the summary exists
    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
      include: {
        topics: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!summary) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
      );
    }

    // Get user's edits for this summary
    const userEdits = await prisma.userTopicEdit.findMany({
      where: {
        userId,
        summaryId,
      },
    });

    // Create a map of edits by topicId for quick lookup
    const editsByTopicId = new Map(
      userEdits.map((edit) => [edit.topicId, edit])
    );

    // Merge original topics with user edits
    const topics = summary.topics.map((topic) => {
      const edit = editsByTopicId.get(topic.id);
      if (edit) {
        return {
          id: topic.id,
          title: edit.customTitle ?? topic.title,
          startMs: edit.customStartMs ?? topic.startMs,
          endMs: edit.customEndMs ?? topic.endMs,
          order: topic.order,
          isEdited: true,
        };
      }
      return {
        id: topic.id,
        title: topic.title,
        startMs: topic.startMs,
        endMs: topic.endMs,
        order: topic.order,
        isEdited: false,
      };
    });

    return NextResponse.json({
      success: true,
      summaryId,
      topics,
    });
  } catch (error) {
    console.error("Error fetching user topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/topics/edit
 * Save/update user topic edits for a summary
 * Body: { summaryId: string, topics: TopicEdit[] }
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

    const body = await request.json();
    const { summaryId, topics } = body as {
      summaryId: string;
      topics: TopicEdit[];
    };

    // Validate required fields
    if (!summaryId) {
      return NextResponse.json(
        { error: "summaryId is required" },
        { status: 400 }
      );
    }

    if (!topics || !Array.isArray(topics)) {
      return NextResponse.json(
        { error: "topics array is required" },
        { status: 400 }
      );
    }

    // Verify the summary exists
    const summary = await prisma.summary.findUnique({
      where: { id: summaryId },
      include: {
        topics: true,
      },
    });

    if (!summary) {
      return NextResponse.json(
        { error: "Summary not found" },
        { status: 404 }
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

    // Create a set of valid topic IDs for this summary
    const validTopicIds = new Set(summary.topics.map((t) => t.id));

    // Validate all topic edits reference valid topics
    for (const edit of topics) {
      if (!edit.topicId) {
        return NextResponse.json(
          { error: "Each topic edit must have a topicId" },
          { status: 400 }
        );
      }
      if (!validTopicIds.has(edit.topicId)) {
        return NextResponse.json(
          { error: `Topic ${edit.topicId} does not belong to this summary` },
          { status: 400 }
        );
      }
    }

    // Save/update each topic edit using upsert
    const savedEdits = await Promise.all(
      topics.map((edit) =>
        prisma.userTopicEdit.upsert({
          where: {
            userId_topicId: {
              userId,
              topicId: edit.topicId,
            },
          },
          create: {
            userId,
            summaryId,
            topicId: edit.topicId,
            customTitle: edit.customTitle ?? null,
            customStartMs: edit.customStartMs ?? null,
            customEndMs: edit.customEndMs ?? null,
          },
          update: {
            customTitle: edit.customTitle ?? null,
            customStartMs: edit.customStartMs ?? null,
            customEndMs: edit.customEndMs ?? null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Saved ${savedEdits.length} topic edit(s)`,
      editCount: savedEdits.length,
    });
  } catch (error) {
    console.error("Error saving user topics:", error);
    return NextResponse.json(
      { error: "Failed to save topic edits" },
      { status: 500 }
    );
  }
}
