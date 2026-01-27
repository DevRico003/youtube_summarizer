"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, Check, Key, RefreshCw, ChevronRight } from "lucide-react"
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
    setCurrentStep(2)
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
            <div className="text-center text-muted-foreground py-8">
              <p>Step 2: Supadata API Key</p>
              <p className="text-sm mt-2">Coming in US-007</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Step 3: Z.AI API Key</p>
              <p className="text-sm mt-2">Coming in US-008</p>
            </div>
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
