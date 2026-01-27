"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, Key, RefreshCw, ChevronRight, ChevronLeft, Loader2, CheckCircle2, XCircle, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Generate a cryptographically secure random string
function generateSecret(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export default function SetupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [secret, setSecret] = useState("")
  const [customSecret, setCustomSecret] = useState("")
  const [useCustom, setUseCustom] = useState(false)
  const [copied, setCopied] = useState(false)

  // Step 2: Supadata API key state
  const [supadataKey, setSupadataKey] = useState("")
  const [supadataStatus, setSupadataStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [supadataError, setSupadataError] = useState("")
  const [supadataSaving, setSupadataSaving] = useState(false)

  // Step 3: Z.AI API key state
  const [zaiKey, setZaiKey] = useState("")
  const [zaiStatus, setZaiStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [zaiError, setZaiError] = useState("")
  const [zaiSaving, setZaiSaving] = useState(false)

  // Generate initial secret on mount
  useEffect(() => {
    setSecret(generateSecret())
  }, [])

  const handleRegenerate = () => {
    setSecret(generateSecret())
    setCopied(false)
  }

  const handleCopy = async () => {
    const secretToCopy = useCustom ? customSecret : secret
    try {
      await navigator.clipboard.writeText(secretToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy to clipboard:", err)
    }
  }

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "supadata", apiKey: supadataKey }),
      })

      const data = await response.json()

      if (data.success) {
        setSupadataStatus("success")
      } else {
        setSupadataStatus("error")
        setSupadataError(data.error || "Validation failed")
      }
    } catch (error) {
      setSupadataStatus("error")
      setSupadataError("Failed to test API key")
    }
  }

  // Save Supadata API key and proceed to next step
  const handleSaveSupadata = async () => {
    setSupadataSaving(true)

    try {
      const response = await fetch("/api/setup/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "supadata", apiKey: supadataKey }),
      })

      const data = await response.json()

      if (data.success) {
        handleNext()
      } else {
        setSupadataError(data.error || "Failed to save API key")
      }
    } catch (error) {
      setSupadataError("Failed to save API key")
    } finally {
      setSupadataSaving(false)
    }
  }

  // Skip Supadata and proceed to next step
  const handleSkipSupadata = async () => {
    setSupadataSaving(true)

    try {
      // Call save-key with empty key to signal skip
      await fetch("/api/setup/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "supadata", apiKey: "" }),
      })
      handleNext()
    } catch (error) {
      // Even if the call fails, we can still proceed since skipping is optional
      handleNext()
    } finally {
      setSupadataSaving(false)
    }
  }

  // Test Z.AI API key
  const handleTestZai = async () => {
    if (!zaiKey.trim()) return

    setZaiStatus("testing")
    setZaiError("")

    try {
      const response = await fetch("/api/setup/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "zai", apiKey: zaiKey }),
      })

      const data = await response.json()

      if (data.success) {
        setZaiStatus("success")
      } else {
        setZaiStatus("error")
        setZaiError(data.error || "Validation failed")
      }
    } catch (error) {
      setZaiStatus("error")
      setZaiError("Failed to test API key")
    }
  }

  // Save Z.AI API key and proceed to next step
  const handleSaveZai = async () => {
    setZaiSaving(true)

    try {
      const response = await fetch("/api/setup/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "zai", apiKey: zaiKey }),
      })

      const data = await response.json()

      if (data.success) {
        handleNext()
      } else {
        setZaiError(data.error || "Failed to save API key")
      }
    } catch (error) {
      setZaiError("Failed to save API key")
    } finally {
      setZaiSaving(false)
    }
  }

  // Skip Z.AI and proceed to next step
  const handleSkipZai = async () => {
    setZaiSaving(true)

    try {
      // Call save-key with empty key to signal skip
      await fetch("/api/setup/save-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: "zai", apiKey: "" }),
      })
      handleNext()
    } catch (error) {
      // Even if the call fails, we can still proceed since skipping is optional
      handleNext()
    } finally {
      setZaiSaving(false)
    }
  }

  const activeSecret = useCustom ? customSecret : secret
  const isValidSecret = activeSecret.length >= 16

  const steps = [
    { number: 1, title: "App Secret" },
    { number: 2, title: "Supadata API" },
    { number: 3, title: "Z.AI API" },
    { number: 4, title: "Fallback Models" },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Setup Wizard</CardTitle>
          <CardDescription className="text-center">
            Configure your YouTube AI Summarizer
          </CardDescription>

          {/* Step indicator */}
          <div className="flex justify-center mt-6">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      currentStep === step.number
                        ? "bg-primary text-primary-foreground"
                        : currentStep > step.number
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        currentStep > step.number ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <>
              <div className="flex items-center space-x-2 text-lg font-medium">
                <Key className="h-5 w-5" />
                <span>Step 1: App Secret</span>
              </div>

              <p className="text-sm text-muted-foreground">
                The app secret is used to encrypt sensitive data like API keys. Generate a new secret or enter your own.
              </p>

              {/* Generated Secret Display */}
              {!useCustom && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Generated Secret</label>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={secret}
                        readOnly
                        className="font-mono text-sm pr-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerate}
                      title="Generate new secret"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Custom Secret Input */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useCustom"
                    checked={useCustom}
                    onChange={(e) => setUseCustom(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="useCustom" className="text-sm font-medium">
                    Use custom secret
                  </label>
                </div>
                {useCustom && (
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      value={customSecret}
                      onChange={(e) => setCustomSecret(e.target.value)}
                      placeholder="Enter your custom secret (min 16 characters)"
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                {useCustom && customSecret.length > 0 && customSecret.length < 16 && (
                  <p className="text-sm text-destructive">
                    Secret must be at least 16 characters long
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-medium">Instructions</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Copy the secret above using the copy button</li>
                  <li>
                    Open your <code className="bg-background px-1 rounded">.env</code> file in the project root
                  </li>
                  <li>
                    Add the following line:
                    <pre className="bg-background mt-1 p-2 rounded text-xs overflow-x-auto">
                      APP_SECRET={activeSecret || "<your-secret>"}
                    </pre>
                  </li>
                  <li>Save the file and restart the development server</li>
                </ol>
              </div>

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={!isValidSecret}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="flex items-center space-x-2 text-lg font-medium">
                <Key className="h-5 w-5" />
                <span>Step 2: Supadata API Key</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Supadata is used to fetch YouTube video transcripts. Get your API key from{" "}
                <a
                  href="https://supadata.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  supadata.ai
                </a>
              </p>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
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
                  <div className="flex items-center space-x-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>{supadataError}</span>
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Why Supadata?</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Fetches transcripts from YouTube, TikTok, Instagram</li>
                  <li>Supports multiple languages</li>
                  <li>Provides accurate timestamps for topic detection</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Note:</strong> This key is optional. You can skip this step and configure it later in settings.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    onClick={handleSkipSupadata}
                    disabled={supadataSaving}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  <Button
                    onClick={handleSaveSupadata}
                    disabled={!supadataKey.trim() || supadataSaving}
                  >
                    {supadataSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="flex items-center space-x-2 text-lg font-medium">
                <Key className="h-5 w-5" />
                <span>Step 3: Z.AI API Key</span>
              </div>

              <p className="text-sm text-muted-foreground">
                Z.AI provides access to GLM-4.7, a powerful reasoning model. Get your API key from{" "}
                <a
                  href="https://z.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  z.ai
                </a>
              </p>

              {/* API Key Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex space-x-2">
                  <Input
                    type="password"
                    value={zaiKey}
                    onChange={(e) => {
                      setZaiKey(e.target.value)
                      setZaiStatus("idle")
                      setZaiError("")
                    }}
                    placeholder="Enter your Z.AI API key"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestZai}
                    disabled={!zaiKey.trim() || zaiStatus === "testing"}
                  >
                    {zaiStatus === "testing" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>

                {/* Status indicator */}
                {zaiStatus === "success" && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>API key is valid</span>
                  </div>
                )}
                {zaiStatus === "error" && (
                  <div className="flex items-center space-x-2 text-sm text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>{zaiError}</span>
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm">Why Z.AI (GLM-4.7)?</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Primary model for summary generation</li>
                  <li>Advanced reasoning and thinking capabilities</li>
                  <li>Supports detailed topic extraction with timestamps</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Note:</strong> This key is optional. You can skip this step and configure it later in settings.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    onClick={handleSkipZai}
                    disabled={zaiSaving}
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip
                  </Button>
                  <Button
                    onClick={handleSaveZai}
                    disabled={!zaiKey.trim() || zaiSaving}
                  >
                    {zaiSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Step 4: Fallback Models</p>
              <p className="text-sm mt-2">Coming in US-009</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
