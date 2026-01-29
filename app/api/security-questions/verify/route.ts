import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

interface VerifyAnswer {
  questionId: string
  answer: string
}

/**
 * POST /api/security-questions/verify
 * Verify security question answers for password reset
 * Requires 2 out of 3 correct answers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, answers } = body as { email: string; answers: VerifyAnswer[] }

    // Validate input
    if (!email || !answers || answers.length !== 2) {
      return NextResponse.json(
        { error: "Email and exactly 2 answers are required" },
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
    if (!user) {
      // Add delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500))
      return NextResponse.json(
        { error: "Invalid email or security answers" },
        { status: 401 }
      )
    }

    // Get user's security questions
    const userQuestions = await prisma.userSecurityQuestion.findMany({
      where: { userId: user.id },
    })

    if (userQuestions.length < 3) {
      // User hasn't set up security questions
      return NextResponse.json(
        { error: "Security questions not set up for this account" },
        { status: 400 }
      )
    }

    // Verify answers
    let correctCount = 0
    for (const answer of answers) {
      const userQuestion = userQuestions.find((q) => q.questionId === answer.questionId)
      if (userQuestion) {
        const isCorrect = await bcrypt.compare(
          answer.answer.toLowerCase().trim(),
          userQuestion.answerHash
        )
        if (isCorrect) {
          correctCount++
        }
      }
    }

    // Require 2 correct answers
    if (correctCount < 2) {
      return NextResponse.json(
        { error: "Invalid email or security answers" },
        { status: 401 }
      )
    }

    // Generate a temporary reset token (stored in verification table)
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Delete any existing tokens for this email before creating a new one
    await prisma.verification.deleteMany({
      where: { identifier: email.toLowerCase() },
    })

    await prisma.verification.create({
      data: {
        identifier: email.toLowerCase(),
        value: resetToken,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      resetToken,
      message: "Security questions verified successfully",
    })
  } catch (error) {
    console.error("Error verifying security questions:", error)
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    )
  }
}
