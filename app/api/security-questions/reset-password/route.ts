import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validatePassword } from "@/lib/auth-server"
import bcrypt from "bcrypt"

/**
 * POST /api/security-questions/reset-password
 * Reset password after security question verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, resetToken, newPassword } = body as {
      email: string
      resetToken: string
      newPassword: string
    }

    // Validate input
    if (!email || !resetToken || !newPassword) {
      return NextResponse.json(
        { error: "Email, reset token, and new password are required" },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Find and validate reset token
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: email.toLowerCase(),
        value: resetToken,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 401 }
      )
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email.toLowerCase(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    // Update password in Account table (better-auth stores password in Account)
    await prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      data: {
        password: passwordHash,
      },
    })

    // Delete the used verification token
    await prisma.verification.delete({
      where: { id: verification.id },
    })

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. Please sign in with your new password.",
    })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    )
  }
}
