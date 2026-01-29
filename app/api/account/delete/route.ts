import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateRequest } from "@/lib/apiAuth"
import bcrypt from "bcrypt"

/**
 * POST /api/account/delete
 * Delete user account with password confirmation (GDPR-compliant immediate deletion)
 */
export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request)
  if (!authResult.success) {
    return authResult.response
  }

  const { userId } = authResult

  try {
    const body = await request.json()
    const { password } = body as { password: string }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required to delete account" },
        { status: 400 }
      )
    }

    // Get user's account with password
    const account = await prisma.account.findFirst({
      where: {
        userId,
        providerId: "credential",
      },
    })

    if (!account || !account.password) {
      return NextResponse.json(
        { error: "Account not found or no password set" },
        { status: 400 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      )
    }

    // Delete user and all related data (cascade delete handles relations)
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    )
  }
}
