"use client"

import { AuthProvider } from "@/components/auth-provider"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
