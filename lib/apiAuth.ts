import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth-server"

/**
 * Result of authentication attempt
 */
export type AuthResult =
  | { success: true; userId: string; session: Awaited<ReturnType<typeof auth.api.getSession>> }
  | { success: false; response: NextResponse }

/**
 * Authenticates a request by validating the session cookie.
 * Uses better-auth's cookie-based session management.
 *
 * @param request - The incoming Next.js request
 * @returns AuthResult with userId and session on success, or 401 response on failure
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session || !session.user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Unauthorized - Invalid or expired session" },
          { status: 401 }
        ),
      }
    }

    return {
      success: true,
      userId: session.user.id,
      session,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized - Authentication failed" },
        { status: 401 }
      ),
    }
  }
}

/**
 * Extracts the user ID from a request without returning error response.
 * Useful for optional auth scenarios.
 *
 * @param request - The incoming Next.js request
 * @returns The user ID or null if not authenticated
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    return session?.user?.id ?? null
  } catch {
    return null
  }
}
