import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/security-questions
 * Returns the list of available security questions
 */
export async function GET() {
  try {
    const questions = await prisma.securityQuestion.findMany({
      select: {
        id: true,
        question: true,
      },
      orderBy: {
        question: "asc",
      },
    })

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Error fetching security questions:", error)
    return NextResponse.json(
      { error: "Failed to fetch security questions" },
      { status: 500 }
    )
  }
}
