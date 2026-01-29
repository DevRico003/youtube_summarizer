import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: "", // Relative URL - uses current host automatically
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
