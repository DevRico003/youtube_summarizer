"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireSetupComplete?: boolean
}

export function AuthGuard({ children, requireSetupComplete = false }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    // If setup completion is required and user hasn't completed setup
    if (requireSetupComplete && user && !user.setupCompleted) {
      router.replace("/setup")
      return
    }
  }, [isAuthenticated, isLoading, router, requireSetupComplete, user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requireSetupComplete && user && !user.setupCompleted) {
    return null
  }

  return <>{children}</>
}
