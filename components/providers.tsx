"use client"

import { AuthProvider } from "@/contexts/AuthContext"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
