"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "@/components/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { LogIn, LogOut, Settings, User } from "lucide-react"

export function Header() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <header className="flex h-14 items-center border-b px-4 lg:px-6">
      <MobileSidebar />
      <h1 className="text-lg font-semibold">YouTube AI Summarizer</h1>

      {/* Auth controls on right side */}
      <div className="ml-auto flex items-center gap-2">
        {isLoading ? (
          <span className="text-sm text-muted-foreground">Loading...</span>
        ) : isAuthenticated ? (
          <>
            {/* User email - hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="max-w-[150px] truncate">{user?.email}</span>
            </div>

            {/* Settings link - icon only on mobile */}
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </Button>

            {/* Logout button - icon only on mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="hidden md:inline-flex"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="md:hidden"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
