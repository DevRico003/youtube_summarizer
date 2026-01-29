"use client"

import { useSession, signOut as authSignOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

/**
 * Custom auth hook that wraps better-auth's useSession
 * Provides a similar API to the old AuthContext for easier migration
 */
export function useAuth() {
  const { data: session, isPending, error, refetch } = useSession()
  const router = useRouter()
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null)
  const [isCheckingSetup, setIsCheckingSetup] = useState(false)

  const user = session?.user ?? null
  const isAuthenticated = !!user

  // Fetch setupCompleted directly from API to bypass any caching issues
  useEffect(() => {
    if (!user || isCheckingSetup) return

    const checkSetupStatus = async () => {
      setIsCheckingSetup(true)
      try {
        const response = await fetch("/api/user/setup-status", {
          credentials: "include",
        })
        if (response.ok) {
          const data = await response.json()
          setSetupCompleted(data.setupCompleted)
        }
      } catch (err) {
        console.error("Failed to check setup status:", err)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetupStatus()
  }, [user?.id]) // Only re-run when user ID changes

  const isLoading = isPending || (isAuthenticated && setupCompleted === null)

  const logout = useCallback(async () => {
    await authSignOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login")
        },
      },
    })
  }, [router])

  const updateSetupCompleted = useCallback(async (completed: boolean) => {
    // Update local state immediately
    setSetupCompleted(completed)
    // Also trigger a session refresh
    await refetch()
  }, [refetch])

  return {
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      setupCompleted: setupCompleted ?? false,
    } : null,
    isAuthenticated,
    isLoading,
    error,
    logout,
    updateSetupCompleted,
    refetch,
  }
}
