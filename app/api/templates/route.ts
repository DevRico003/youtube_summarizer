import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Default system prompt template content
 */
const DEFAULT_TEMPLATE_CONTENT = `You are a helpful assistant that summarizes YouTube videos.

Given the following transcript, provide a {{detailLevel}} summary in {{language}}.

Focus on:
- Main topics and key points
- Important facts and figures
- Notable quotes or statements
- Actionable takeaways

Transcript:
{{transcript}}`;

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
 * GET /api/templates
 * Returns user's prompt templates, including a default system template
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

    // Get user's templates
    const templates = await prisma.promptTemplate.findMany({
      where: { userId },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" },
      ],
    });

    // If no templates exist, create a default one
    if (templates.length === 0) {
      const defaultTemplate = await prisma.promptTemplate.create({
        data: {
          userId,
          name: "Default Template",
          content: DEFAULT_TEMPLATE_CONTENT,
          isDefault: true,
        },
      });
      templates.push(defaultTemplate);
    }

    return NextResponse.json({
      success: true,
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        content: t.content,
        isDefault: t.isDefault,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new prompt template
 * Body: { name: string, content: string }
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
    const { name, content } = body as {
      name?: string;
      content?: string;
    };

    // Validate required fields
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Template content is required" },
        { status: 400 }
      );
    }

    // Check if template with same name already exists
    const existingTemplate = await prisma.promptTemplate.findUnique({
      where: {
        userId_name: {
          userId,
          name: name.trim(),
        },
      },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: "A template with this name already exists" },
        { status: 409 }
      );
    }

    // Create the template
    const template = await prisma.promptTemplate.create({
      data: {
        userId,
        name: name.trim(),
        content: content.trim(),
        isDefault: false,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        isDefault: template.isDefault,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates
 * Update an existing prompt template
 * Body: { id: string, name?: string, content?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, content } = body as {
      id?: string;
      name?: string;
      content?: string;
    };

    // Validate template ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find the template and verify ownership
    const existingTemplate = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (existingTemplate.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to update this template" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: {
      name?: string;
      content?: string;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Template name cannot be empty" },
          { status: 400 }
        );
      }

      // Check if another template with the same name exists
      if (name.trim() !== existingTemplate.name) {
        const duplicateName = await prisma.promptTemplate.findUnique({
          where: {
            userId_name: {
              userId,
              name: name.trim(),
            },
          },
        });

        if (duplicateName) {
          return NextResponse.json(
            { error: "A template with this name already exists" },
            { status: 409 }
          );
        }
      }

      updateData.name = name.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string" || content.trim().length === 0) {
        return NextResponse.json(
          { error: "Template content cannot be empty" },
          { status: 400 }
        );
      }
      updateData.content = content.trim();
    }

    // Update the template
    const template = await prisma.promptTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        content: template.content,
        isDefault: template.isDefault,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates?id=xxx
 * Delete a prompt template
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find the template and verify ownership
    const existingTemplate = await prisma.promptTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    if (existingTemplate.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized to delete this template" },
        { status: 403 }
      );
    }

    // Prevent deleting the default template
    if (existingTemplate.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default template" },
        { status: 400 }
      );
    }

    // Delete the template
    await prisma.promptTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
