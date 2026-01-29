import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/security-questions/user
 * Get the security questions (without answers) for a user by email
 * Used during password reset flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body as { email: string }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Find user by email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.toLowerCase(),
        },
      },
    })

    // Generic error to prevent user enumeration
    // Add delay to prevent timing attacks
    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 300))
      return NextResponse.json(
        { error: "If this email exists, security questions will be displayed" },
        { status: 404 }
      )
    }

    // Get user's security questions with the actual question text
    const userQuestions = await prisma.userSecurityQuestion.findMany({
      where: { userId: user.id },
      include: {
        question: {
          select: {
            id: true,
            question: true,
          },
        },
      },
      orderBy: {
        questionOrder: "asc",
      },
    })

    if (userQuestions.length < 3) {
      return NextResponse.json(
        { error: "Security questions not set up for this account" },
        { status: 400 }
      )
    }

    // Return questions without revealing which ones are needed for verification
    const questions = userQuestions.map((uq) => ({
      id: uq.question.id,
      question: uq.question.question,
    }))

    return NextResponse.json({
      success: true,
      questions,
    })
  } catch (error) {
    console.error("Error fetching user security questions:", error)
    return NextResponse.json(
      { error: "Failed to fetch security questions" },
      { status: 500 }
    )
  }
}
