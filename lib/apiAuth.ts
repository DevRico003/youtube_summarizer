import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./auth";

/**
 * Result of authentication attempt
 */
export type AuthResult =
  | { success: true; userId: string }
  | { success: false; response: NextResponse };

/**
 * Authenticates a request by extracting and validating the JWT token
 * from the Authorization header.
 *
 * @param request - The incoming Next.js request
 * @returns AuthResult with userId on success, or 401 response on failure
 */
export function authenticateRequest(request: NextRequest): AuthResult {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized - Missing or invalid authorization header" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized - Invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    userId: payload.userId,
  };
}

/**
 * Extracts the user ID from an authorization header without returning error response.
 * Useful for optional auth scenarios.
 *
 * @param authHeader - The Authorization header value
 * @returns The user ID or null if not authenticated
 */
export function getUserIdFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}
