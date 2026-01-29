import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { prisma } from "./prisma"
import bcrypt from "bcrypt"

/**
 * Password validation rules:
 * - Minimum 10 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 10) {
    return { valid: false, error: "Password must be at least 10 characters long" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" }
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, error: "Password must contain at least one special character" }
  }
  return { valid: true }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    password: {
      hash: async (password) => {
        return bcrypt.hash(password, 12)
      },
      verify: async ({ password, hash }) => {
        return bcrypt.compare(password, hash)
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days default
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: false, // Disabled to ensure setupCompleted is always fresh
    },
    additionalFields: {
      setupCompleted: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },

  user: {
    additionalFields: {
      setupCompleted: {
        type: "boolean",
        defaultValue: false,
        input: false, // Not settable via signup
      },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60, // 1 minute window
    max: 10, // Max 10 requests per window for auth endpoints
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],

  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // After session creation, copy setupCompleted from user to session
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { setupCompleted: true },
          })
          if (user) {
            await prisma.session.update({
              where: { id: session.id },
              data: { setupCompleted: user.setupCompleted },
            })
          }
        },
      },
    },
  },

  plugins: [
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
