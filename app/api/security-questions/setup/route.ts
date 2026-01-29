import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateRequest } from "@/lib/apiAuth"
import bcrypt from "bcrypt"

interface SecurityQuestionAnswer {
  questionId: string
  answer: string
}

/**
 * POST /api/security-questions/setup
 * Set up security questions for a user (requires exactly 3 questions)
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { userId } = authResult

  try {
    const body = await request.json()
    const { answers } = body as { answers: SecurityQuestionAnswer[] }

    // Validate we have exactly 3 questions
    if (!answers || answers.length !== 3) {
      return NextResponse.json(
        { error: "Exactly 3 security questions are required" },
        { status: 400 }
      )
    }

    // Validate all questions exist and are unique
    const questionIds = answers.map((a) => a.questionId)
    const uniqueIds = new Set(questionIds)
    if (uniqueIds.size !== 3) {
      return NextResponse.json(
        { error: "All 3 security questions must be different" },
        { status: 400 }
      )
    }

    // Validate answers are not empty
    for (const answer of answers) {
      if (!answer.answer || answer.answer.trim().length < 2) {
        return NextResponse.json(
          { error: "All answers must be at least 2 characters long" },
          { status: 400 }
        )
      }
    }

    // Verify all questions exist in database
    const existingQuestions = await prisma.securityQuestion.findMany({
      where: { id: { in: questionIds } },
    })

    if (existingQuestions.length !== 3) {
      return NextResponse.json(
        { error: "One or more invalid question IDs" },
        { status: 400 }
      )
    }

    // Check if user already has security questions
    const existingUserQuestions = await prisma.userSecurityQuestion.findMany({
      where: { userId },
    })

    if (existingUserQuestions.length > 0) {
      return NextResponse.json(
        { error: "Security questions already set up. Use the update endpoint to modify." },
        { status: 400 }
      )
    }

    // Hash answers and create records
    const hashedAnswers = await Promise.all(
      answers.map(async (answer, index) => ({
        userId,
        questionId: answer.questionId,
        answerHash: await bcrypt.hash(answer.answer.toLowerCase().trim(), 10),
        questionOrder: index + 1,
      }))
    )

    // Create all security question answers in a transaction
    await prisma.$transaction(
      hashedAnswers.map((data) =>
        prisma.userSecurityQuestion.create({ data })
      )
    )

    return NextResponse.json({
      success: true,
      message: "Security questions set up successfully",
    })
  } catch (error) {
    console.error("Error setting up security questions:", error)
    return NextResponse.json(
      { error: "Failed to set up security questions" },
      { status: 500 }
    )
  }
}
