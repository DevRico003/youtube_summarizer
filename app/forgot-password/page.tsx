"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Mail, Lock, Loader2, AlertCircle, ArrowLeft, CheckCircle2, ShieldQuestion } from "lucide-react"
import { containerVariants, itemVariants } from "@/lib/animations"
import { cn } from "@/lib/utils"

interface SecurityQuestion {
  id: string
  question: string
}

type Step = "email" | "questions" | "newPassword" | "success"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [questions, setQuestions] = useState<SecurityQuestion[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<{ id: string; answer: string }[]>([
    { id: "", answer: "" },
    { id: "", answer: "" },
  ])
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Step 1: Submit email and get security questions
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/security-questions/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to find account")
        return
      }

      setQuestions(data.questions)
      setStep("questions")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Submit security question answers
  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate selections
    if (selectedQuestions[0].id === selectedQuestions[1].id) {
      setError("Please select two different questions")
      return
    }

    if (!selectedQuestions[0].answer.trim() || !selectedQuestions[1].answer.trim()) {
      setError("Please answer both questions")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/security-questions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          answers: selectedQuestions.map((q) => ({
            questionId: q.id,
            answer: q.answer,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Verification failed")
        return
      }

      setResetToken(data.resetToken)
      setStep("newPassword")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Submit new password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Client-side password validation
    if (newPassword.length < 10) {
      setError("Password must be at least 10 characters long")
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter")
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one number")
      return
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
      setError("Password must contain at least one special character")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/security-questions/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          resetToken,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to reset password")
        return
      }

      setStep("success")
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
              {/* Step 1: Email */}
              {step === "email" && (
                <>
                  <div className="text-center mb-6">
                    <h1 className="font-display text-2xl font-bold text-slate-900">Reset Password</h1>
                    <p className="text-slate-500 mt-1">Enter your email to continue</p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-5">
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
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold">
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Finding account...</span>
                          </>
                        ) : (
                          <span>Continue</span>
                        )}
                      </div>
                    </motion.button>
                  </form>
                </>
              )}

              {/* Step 2: Security Questions */}
              {step === "questions" && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center">
                      <ShieldQuestion className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h1 className="font-display text-2xl font-bold text-slate-900">Security Questions</h1>
                    <p className="text-slate-500 mt-1">Answer any 2 of your 3 security questions</p>
                  </div>

                  <form onSubmit={handleQuestionsSubmit} className="space-y-5">
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

                    {[0, 1].map((index) => (
                      <div key={index} className="space-y-3 p-4 bg-slate-50 rounded-xl">
                        <label className="text-sm font-medium text-slate-700">
                          Question {index + 1}
                        </label>
                        <select
                          value={selectedQuestions[index].id}
                          onChange={(e) => updateSelectedQuestion(index, "id", e.target.value)}
                          className={cn(
                            "w-full h-12 px-4 rounded-xl",
                            "bg-white border border-slate-200",
                            "text-slate-900",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          )}
                          required
                        >
                          <option value="">Select a question</option>
                          {questions.map((q) => (
                            <option key={q.id} value={q.id}>
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
                            "w-full h-12 px-4 rounded-xl",
                            "bg-white border border-slate-200",
                            "text-slate-900 placeholder:text-slate-400",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          )}
                          required
                        />
                      </div>
                    ))}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="flex items-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
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
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <span>Verify Answers</span>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  </form>
                </>
              )}

              {/* Step 3: New Password */}
              {step === "newPassword" && (
                <>
                  <div className="text-center mb-6">
                    <h1 className="font-display text-2xl font-bold text-slate-900">Set New Password</h1>
                    <p className="text-slate-500 mt-1">Create a strong new password</p>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-5">
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

                    <div className="space-y-2">
                      <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className={cn(
                            "w-full h-12 pl-12 pr-4 rounded-xl",
                            "bg-slate-50/80 border border-slate-200",
                            "text-slate-900 placeholder:text-slate-400",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          )}
                          required
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Min 10 characters, 1 uppercase, 1 number, 1 special character
                      </p>
                    </div>

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
                          placeholder="Confirm new password"
                          className={cn(
                            "w-full h-12 pl-12 pr-4 rounded-xl",
                            "bg-slate-50/80 border border-slate-200",
                            "text-slate-900 placeholder:text-slate-400",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          )}
                          required
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isLoading || !newPassword || !confirmPassword}
                      className="w-full relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                      <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold">
                        {isLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Resetting password...</span>
                          </>
                        ) : (
                          <span>Reset Password</span>
                        )}
                      </div>
                    </motion.button>
                  </form>
                </>
              )}

              {/* Step 4: Success */}
              {step === "success" && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
                    Password Reset!
                  </h1>
                  <p className="text-slate-500 mb-6">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-400 text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Go to Sign In
                  </Link>
                </div>
              )}

              {/* Footer - Only show on non-success steps */}
              {step !== "success" && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-slate-500">
                    Remember your password?{" "}
                    <Link
                      href="/login"
                      className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
