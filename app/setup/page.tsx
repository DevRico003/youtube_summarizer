"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Key, ChevronRight, ChevronLeft, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card"
import { AnimatedBackground } from "@/components/animated-background"
import { useAuth } from "@/hooks/useAuth"
import { containerVariants, itemVariants } from "@/lib/animations"

export default function SetupWizard() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, updateSetupCompleted } = useAuth()
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Supadata API key state
  const [supadataKey, setSupadataKey] = useState("")
  const [supadataStatus, setSupadataStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [supadataError, setSupadataError] = useState("")
  const [supadataSaving, setSupadataSaving] = useState(false)

  // Step 2: Z.AI API key state
  const [zaiKey, setZaiKey] = useState("")

  const [step2Saving, setStep2Saving] = useState(false)
  const [step2Error, setStep2Error] = useState("")

  // Check auth and setup status on mount
  useEffect(() => {
    if (authLoading) return

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    // If setup is already completed, redirect to home
    if (user?.setupCompleted) {
      router.replace("/")
      return
    }

    setIsCheckingStatus(false)
  }, [authLoading, isAuthenticated, user, router])

  const handleNext = () => {
    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1)
  }

  // Test Supadata API key
  const handleTestSupadata = async () => {
    if (!supadataKey.trim()) return

    setSupadataStatus("testing")
    setSupadataError("")

    try {
      const response = await fetch("/api/setup/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ service: "supadata", apiKey: supadataKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSupadataStatus("error")
        setSupadataError(data.error || `Test failed (${response.status})`)
        return
      }

      if (data.success) {
        setSupadataStatus("success")
      } else {
        setSupadataStatus("error")
        setSupadataError(data.error || "Validation failed")
      }
    } catch {
      setSupadataStatus("error")
      setSupadataError("Failed to test API key")
    }
  }

  // Save Supadata API key and proceed to next step
  const handleSaveSupadata = async () => {
    setSupadataSaving(true)
    setSupadataError("")

    try {
      const response = await fetch("/api/setup/save-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ service: "supadata", apiKey: supadataKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSupadataError(data.error || `Failed to save API key (${response.status})`)
        return
      }

      if (data.success) {
        handleNext()
      } else {
        setSupadataError(data.error || "Failed to save API key")
      }
    } catch (err) {
      console.error("Save Supadata error:", err)
      setSupadataError("Failed to save API key")
    } finally {
      setSupadataSaving(false)
    }
  }

  // Save Z.AI key and finish setup
  const handleFinishSetup = async () => {
    setStep2Saving(true)
    setStep2Error("")

    if (!zaiKey.trim()) {
      setStep2Error("Please enter your Z.AI API key")
      setStep2Saving(false)
      return
    }

    try {
      // Save Z.AI key
      const response = await fetch("/api/setup/save-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ service: "zai", apiKey: zaiKey }),
      })
      const data = await response.json()
      if (!data.success && !data.skipped) {
        setStep2Error("Failed to save Z.AI API key")
        setStep2Saving(false)
        return
      }

      // Mark setup as complete in database
      const completeResponse = await fetch("/api/setup/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      const completeData = await completeResponse.json()

      if (completeData.success) {
        // Update local auth state
        await updateSetupCompleted(true)
        router.push("/")
      } else {
        setStep2Error("Failed to complete setup")
      }
    } catch {
      setStep2Error("Failed to save API keys")
    } finally {
      setStep2Saving(false)
    }
  }

  const steps = [
    { number: 1, title: "Supadata API" },
    { number: 2, title: "Z.AI API" },
  ]

  // Show loading state while checking auth/setup status
  if (authLoading || isCheckingStatus) {
    return (
      <>
        <AnimatedBackground intensity="low" />
        <div className="min-h-screen flex items-center justify-center p-4">
          <GlassCard variant="elevated" className="w-full max-w-lg p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
              <p className="text-muted-foreground">Checking configuration...</p>
            </div>
          </GlassCard>
        </div>
      </>
    )
  }

  return (
    <>
      <AnimatedBackground intensity="low" />
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-lg"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <GlassCard variant="elevated" className="p-6">
              <GlassCardHeader className="text-center">
                <GlassCardTitle className="text-2xl font-bold">Setup Wizard</GlassCardTitle>
                <GlassCardDescription>
                  Configure your YouTube AI Summarizer
                </GlassCardDescription>

                {/* Step indicator */}
                <div className="flex justify-center mt-6">
                  <div className="flex items-center space-x-2">
                    {steps.map((step, index) => (
                      <div key={step.number} className="flex items-center">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                            currentStep === step.number
                              ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white"
                              : currentStep > step.number
                              ? "bg-accent-primary/20 text-accent-primary"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {step.number}
                        </div>
                        {index < steps.length - 1 && (
                          <div
                            className={`w-8 h-0.5 mx-1 transition-colors ${
                              currentStep > step.number ? "bg-accent-primary" : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </GlassCardHeader>

              <GlassCardContent className="space-y-6">
                {currentStep === 1 && (
                  <>
                    <div className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                      <Key className="h-5 w-5 text-accent-primary" />
                      <span>Step 1: Supadata API Key</span>
                    </div>

                    <p className="text-sm text-slate-500">
                      Supadata is used to fetch YouTube video transcripts. Get your API key from{" "}
                      <a
                        href="https://supadata.ai/?ref=devrico003"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-primary hover:underline"
                      >
                        supadata.ai
                      </a>
                    </p>

                    {/* API Key Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">API Key</label>
                      <div className="flex space-x-2">
                        <Input
                          type="password"
                          value={supadataKey}
                          onChange={(e) => {
                            setSupadataKey(e.target.value)
                            setSupadataStatus("idle")
                            setSupadataError("")
                          }}
                          placeholder="Enter your Supadata API key"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={handleTestSupadata}
                          disabled={!supadataKey.trim() || supadataStatus === "testing"}
                        >
                          {supadataStatus === "testing" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Test"
                          )}
                        </Button>
                      </div>

                      {/* Status indicator */}
                      {supadataStatus === "success" && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>API key is valid</span>
                        </div>
                      )}
                      {supadataStatus === "error" && (
                        <div className="flex items-center space-x-2 text-sm text-red-500">
                          <XCircle className="h-4 w-4" />
                          <span>{supadataError}</span>
                        </div>
                      )}
                    </div>

                    {/* Info box */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                      <h4 className="font-medium text-sm text-slate-900">Why Supadata?</h4>
                      <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                        <li>Fetches transcripts from YouTube, TikTok, Instagram</li>
                        <li>Supports multiple languages</li>
                        <li>Provides accurate timestamps for topic detection</li>
                        <li><strong className="text-slate-700">100 free credits per month</strong></li>
                      </ul>
                      <p className="text-sm text-amber-600 mt-2">
                        <strong>Required:</strong> A Supadata API key is needed to fetch video transcripts.
                      </p>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSaveSupadata}
                        disabled={!supadataKey.trim() || supadataSaving}
                        className="bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90"
                      >
                        {supadataSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="flex items-center space-x-2 text-lg font-medium text-slate-900">
                      <Key className="h-5 w-5 text-accent-primary" />
                      <span>Step 2: Z.AI API Key</span>
                    </div>

                    <p className="text-sm text-slate-500">
                      Z.AI provides the GLM-4.7 model for generating high-quality summaries.
                    </p>

                    {/* Z.AI API Key Input */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Z.AI API Key</label>
                        <Input
                          type="password"
                          value={zaiKey}
                          onChange={(e) => {
                            setZaiKey(e.target.value)
                          }}
                          placeholder="Enter your Z.AI API key"
                        />
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                        <h4 className="font-medium text-sm text-slate-900">Z.AI GLM-4.7</h4>
                        <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
                          <li>High-quality summaries with excellent comprehension</li>
                          <li>Fast inference for quick results</li>
                          <li>Supports long video transcripts</li>
                        </ul>
                        <p className="text-xs text-slate-400 mt-2">
                          Choose between <strong className="text-slate-600">Coding Plan</strong> (starting at $3/month) or <strong className="text-slate-600">API Credit Mode</strong>.{" "}
                          <a href="https://z.ai/subscribe?ic=D7NHC27OHD" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">
                            Get your key at z.ai
                          </a>
                        </p>
                      </div>
                    </div>

                    {/* Configured Key Badge */}
                    {zaiKey.trim() && (
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          Z.AI configured
                        </span>
                      </div>
                    )}

                    {/* Error message */}
                    {step2Error && (
                      <div className="flex items-center space-x-2 text-sm text-red-500">
                        <XCircle className="h-4 w-4" />
                        <span>{step2Error}</span>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={handleBack}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        onClick={handleFinishSetup}
                        disabled={!zaiKey.trim() || step2Saving}
                        className="bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90"
                      >
                        {step2Saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Finish Setup
                        <Check className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
