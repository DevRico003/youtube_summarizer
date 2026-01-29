"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, Lock, Loader2, AlertCircle, Check, X, ShieldQuestion, ChevronRight } from "lucide-react"
import { containerVariants, itemVariants } from "@/lib/animations"
import { cn } from "@/lib/utils"
import { signUp } from "@/lib/auth-client"
import { useAuth } from "@/hooks/useAuth"

interface SecurityQuestion {
  id: string
  question: string
}

type Step = "credentials" | "security"

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Step management
  const [step, setStep] = useState<Step>("credentials")

  // Step 1: Credentials
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Step 2: Security Questions
  const [availableQuestions, setAvailableQuestions] = useState<SecurityQuestion[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<{ id: string; answer: string }[]>([
    { id: "", answer: "" },
    { id: "", answer: "" },
    { id: "", answer: "" },
  ])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Password validation state
  const passwordChecks = {
    minLength: password.length >= 10,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  }
  const isPasswordValid = Object.values(passwordChecks).every(Boolean)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/")
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch security questions
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch("/api/security-questions")
        const data = await response.json()
        if (data.questions) {
          setAvailableQuestions(data.questions)
        }
      } catch (error) {
        console.error("Failed to fetch security questions:", error)
      }
    }
    fetchQuestions()
  }, [])

  // Step 1: Validate credentials and proceed to security questions
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements")
      return
    }

    // Proceed to security questions step
    setStep("security")
  }

  // Step 2: Create account with security questions
  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate all questions are selected and different
    const selectedIds = selectedQuestions.map((q) => q.id).filter(Boolean)
    if (selectedIds.length !== 3 || new Set(selectedIds).size !== 3) {
      setError("Please select 3 different security questions")
      return
    }

    // Validate all answers are provided
    if (selectedQuestions.some((q) => !q.answer.trim() || q.answer.trim().length < 2)) {
      setError("Please answer all security questions (minimum 2 characters each)")
      return
    }

    setIsLoading(true)

    try {
      // First, create the account
      const result = await signUp.email({
        email,
        password,
        name: email.split("@")[0], // Use email prefix as default name
      })

      if (result.error) {
        // Generic error message to prevent user enumeration
        setError("Registration failed. Please try again or use a different email.")
        return
      }

      // Then, set up security questions
      const securityResponse = await fetch("/api/security-questions/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for auth
        body: JSON.stringify({
          answers: selectedQuestions.map((q) => ({
            questionId: q.id,
            answer: q.answer,
          })),
        }),
      })

      if (!securityResponse.ok) {
        const securityData = await securityResponse.json()
        console.error("Security questions setup failed:", securityData)
        // Account was created but security questions failed
        // Still redirect to setup, they can set security questions later
      }

      // Redirect to setup wizard for API key configuration
      router.push("/setup")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateSelectedQuestion = (index: number, field: "id" | "answer", value: string) => {
    setSelectedQuestions((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen gradient-soft-animated flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    )
  }

  // Don't render if already authenticated
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
              {/* Step indicator */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                      step === "credentials"
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white"
                        : "bg-accent-primary/20 text-accent-primary"
                    )}
                  >
                    1
                  </div>
                  <div className={cn("w-8 h-0.5 transition-colors", step === "security" ? "bg-accent-primary" : "bg-slate-200")} />
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
                      step === "security"
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    2
                  </div>
                </div>
              </div>

              {/* Step 1: Credentials */}
              {step === "credentials" && (
                <>
                  <div className="text-center mb-6">
                    <h1 className="font-display text-2xl font-bold text-slate-900">Create an account</h1>
                    <p className="text-slate-500 mt-1">Enter your details to get started</p>
                  </div>

                  <form onSubmit={handleCredentialsSubmit} className="space-y-5">
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
                            "transition-all"
                          )}
                          required
                        />
                      </div>
                    </div>

                    {/* Password field */}
                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium text-slate-700">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          className={cn(
                            "w-full h-12 pl-12 pr-4 rounded-xl",
                            "bg-slate-50/80 border border-slate-200",
                            "text-slate-900 placeholder:text-slate-400",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                            "transition-all"
                          )}
                          required
                        />
                      </div>

                      {/* Password requirements */}
                      {password && (
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div className={cn("flex items-center gap-1", passwordChecks.minLength ? "text-emerald-600" : "text-slate-400")}>
                            {passwordChecks.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>10+ characters</span>
                          </div>
                          <div className={cn("flex items-center gap-1", passwordChecks.hasUppercase ? "text-emerald-600" : "text-slate-400")}>
                            {passwordChecks.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>1 uppercase</span>
                          </div>
                          <div className={cn("flex items-center gap-1", passwordChecks.hasNumber ? "text-emerald-600" : "text-slate-400")}>
                            {passwordChecks.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>1 number</span>
                          </div>
                          <div className={cn("flex items-center gap-1", passwordChecks.hasSpecial ? "text-emerald-600" : "text-slate-400")}>
                            {passwordChecks.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span>1 special character</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password field */}
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className={cn(
                            "w-full h-12 pl-12 pr-4 rounded-xl",
                            "bg-slate-50/80 border border-slate-200",
                            "text-slate-900 placeholder:text-slate-400",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
                            "transition-all"
                          )}
                          required
                        />
                      </div>
                    </div>

                    {/* Submit button */}
                    <motion.button
                      type="submit"
                      disabled={!email || !password || !confirmPassword || !isPasswordValid}
                      className="w-full relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold">
                        <span>Continue</span>
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </motion.button>
                  </form>
                </>
              )}

              {/* Step 2: Security Questions */}
              {step === "security" && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center">
                      <ShieldQuestion className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h1 className="font-display text-2xl font-bold text-slate-900">Security Questions</h1>
                    <p className="text-slate-500 mt-1">Set up 3 questions for password recovery</p>
                  </div>

                  <form onSubmit={handleSecuritySubmit} className="space-y-4">
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

                    {[0, 1, 2].map((index) => (
                      <div key={index} className="space-y-2 p-3 bg-slate-50 rounded-xl">
                        <label className="text-sm font-medium text-slate-700">
                          Question {index + 1}
                        </label>
                        <select
                          value={selectedQuestions[index].id}
                          onChange={(e) => updateSelectedQuestion(index, "id", e.target.value)}
                          className={cn(
                            "w-full h-10 px-3 rounded-lg",
                            "bg-white border border-slate-200",
                            "text-slate-900 text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          )}
                          required
                        >
                          <option value="">Select a question</option>
                          {availableQuestions.map((q) => (
                            <option key={q.id} value={q.id} disabled={selectedQuestions.some((sq, i) => i !== index && sq.id === q.id)}>
                              {q.question}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={selectedQuestions[index].answer}
                          onChange={(e) => updateSelectedQuestion(index, "answer", e.target.value)}
                          placeholder="Your answer"
                          className={cn(
                            "w-full h-10 px-3 rounded-lg",
                            "bg-white border border-slate-200",
                            "text-slate-900 placeholder:text-slate-400 text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          )}
                          required
                        />
                      </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep("credentials")}
                        className="px-4 py-3 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                        disabled={isLoading}
                      >
                        Back
                      </button>
                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                        <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold">
                          {isLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              <span>Creating account...</span>
                            </>
                          ) : (
                            <span>Create account</span>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  </form>
                </>
              )}

              {/* Footer */}
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                  >
                    Sign in
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
