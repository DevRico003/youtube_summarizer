"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react"
import { containerVariants, itemVariants } from "@/lib/animations"
import { cn } from "@/lib/utils"
import { signIn } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (!user.setupCompleted) {
        router.replace("/setup")
      } else {
        router.replace("/")
      }
    }
  }, [authLoading, isAuthenticated, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn.email({
        email,
        password,
        rememberMe,
      })

      if (result.error) {
        // Generic error message to prevent user enumeration
        setError("Invalid email or password. Please try again.")
        return
      }

      // Get user from the response to check setupCompleted
      const userData = result.data?.user as { setupCompleted?: boolean } | undefined

      // Redirect based on setup completion status
      if (userData?.setupCompleted === false) {
        router.push("/setup")
      } else {
        router.push("/")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen gradient-soft-animated flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    )
  }

  // Don't render if already authenticated (will redirect)
  if (isAuthenticated) {
    return (
      <div className="min-h-screen gradient-soft-animated flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-soft-animated">
      <div className="min-h-screen p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center">
        <motion.div
          className="w-full max-w-md"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="YT Summarizer Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-display text-xl font-semibold text-slate-900">
                YT Summarizer
              </span>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="card-elevated p-6 md:p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl font-bold text-slate-900">Welcome back</h1>
                <p className="text-slate-500 mt-1">Sign in to your account to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-600 border border-red-100"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}

                {/* Email field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className={cn(
                        "w-full h-12 pl-12 pr-4 rounded-xl",
                        "bg-slate-50/80 border border-slate-200",
                        "text-slate-900 placeholder:text-slate-400",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                        "transition-all",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={cn(
                        "w-full h-12 pl-12 pr-4 rounded-xl",
                        "bg-slate-50/80 border border-slate-200",
                        "text-slate-900 placeholder:text-slate-400",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                        "transition-all",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-slate-600">
                    Remember me for 30 days
                  </label>
                </div>

                {/* Submit button */}
                <motion.button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign in</span>
                    )}
                  </div>
                </motion.button>
              </form>

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                  >
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
