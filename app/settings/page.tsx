"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Settings, Key, Sliders, FileText, BarChart3, ArrowLeft, Loader2, Check, AlertCircle, Trash2, Eye, EyeOff, Brain, Globe } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DetailSlider } from "@/components/DetailSlider"
import Link from "next/link"

type Tab = "api-keys" | "preferences" | "prompt-templates" | "usage"

interface ApiKeyInfo {
  configured: boolean
  masked: string | null
  displayName: string
}

interface ApiKeyState {
  value: string
  showPassword: boolean
  testing: boolean
  testStatus: "idle" | "success" | "error"
  testMessage: string
  saving: boolean
  deleting: boolean
}

const API_KEY_SERVICES = ["supadata", "zai", "gemini", "groq", "openai"] as const
type ApiKeyService = typeof API_KEY_SERVICES[number]

// Available languages for summary output
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "ru", label: "Russian" },
]

// Available models
const MODELS = [
  { id: "glm-4.7", name: "GLM-4.7 (Z.AI)", supportsThinking: true },
  { id: "gemini", name: "Gemini 1.5 Flash", supportsThinking: false },
  { id: "groq", name: "Llama 3.1 (Groq)", supportsThinking: false },
  { id: "openai", name: "GPT-4o Mini", supportsThinking: false },
]

interface UserPreferences {
  language: string
  detailLevel: number
  preferredModel: string
  thinkingMode: boolean
  customPrompt: string | null
}

const tabs: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "api-keys", label: "API Keys", icon: <Key className="h-4 w-4" />, description: "Manage your API keys" },
  { id: "preferences", label: "Preferences", icon: <Sliders className="h-4 w-4" />, description: "Customize your settings" },
  { id: "prompt-templates", label: "Prompt Templates", icon: <FileText className="h-4 w-4" />, description: "Create custom prompts" },
  { id: "usage", label: "Usage", icon: <BarChart3 className="h-4 w-4" />, description: "View your usage stats" },
]

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("api-keys")

  // API Keys tab state
  const [apiKeysLoading, setApiKeysLoading] = useState(true)
  const [apiKeysError, setApiKeysError] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyInfo>>({})
  const [apiKeyStates, setApiKeyStates] = useState<Record<string, ApiKeyState>>({})

  // Preferences tab state
  const [preferencesLoading, setPreferencesLoading] = useState(true)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: "en",
    detailLevel: 3,
    preferredModel: "glm-4.7",
    thinkingMode: false,
    customPrompt: null,
  })
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null)
  const [preferencesSaving, setPreferencesSaving] = useState(false)
  const [preferencesSaveStatus, setPreferencesSaveStatus] = useState<"idle" | "success" | "error">("idle")

  // Get token from localStorage
  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("token")
  }, [])

  // Fetch API keys status
  const fetchApiKeys = useCallback(async () => {
    const token = getToken()
    if (!token) return

    setApiKeysLoading(true)
    setApiKeysError(null)

    try {
      const response = await fetch("/api/settings/api-keys", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch API keys")
      }

      const data = await response.json()
      setApiKeys(data.keys)

      // Initialize states for each service
      const initialStates: Record<string, ApiKeyState> = {}
      for (const service of API_KEY_SERVICES) {
        initialStates[service] = {
          value: "",
          showPassword: false,
          testing: false,
          testStatus: "idle",
          testMessage: "",
          saving: false,
          deleting: false,
        }
      }
      setApiKeyStates(initialStates)
    } catch (error) {
      console.error("Error fetching API keys:", error)
      setApiKeysError("Failed to load API keys")
    } finally {
      setApiKeysLoading(false)
    }
  }, [getToken])

  // Test an API key
  const testApiKey = async (service: ApiKeyService) => {
    const state = apiKeyStates[service]
    if (!state.value.trim()) return

    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], testing: true, testStatus: "idle", testMessage: "" }
    }))

    try {
      const response = await fetch("/api/setup/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service,
          apiKey: state.value.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], testing: false, testStatus: "success", testMessage: "API key is valid" }
        }))
      } else {
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], testing: false, testStatus: "error", testMessage: data.error || "Invalid API key" }
        }))
      }
    } catch {
      setApiKeyStates(prev => ({
        ...prev,
        [service]: { ...prev[service], testing: false, testStatus: "error", testMessage: "Failed to test API key" }
      }))
    }
  }

  // Save an API key
  const saveApiKey = async (service: ApiKeyService) => {
    const state = apiKeyStates[service]
    if (!state.value.trim()) return

    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], saving: true }
    }))

    try {
      const response = await fetch("/api/setup/save-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service,
          apiKey: state.value.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh API keys to show updated masked value
        await fetchApiKeys()
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], saving: false, value: "", testStatus: "idle", testMessage: "" }
        }))
      } else {
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], saving: false, testStatus: "error", testMessage: data.error || "Failed to save API key" }
        }))
      }
    } catch {
      setApiKeyStates(prev => ({
        ...prev,
        [service]: { ...prev[service], saving: false, testStatus: "error", testMessage: "Failed to save API key" }
      }))
    }
  }

  // Delete an API key
  const deleteApiKey = async (service: ApiKeyService) => {
    const token = getToken()
    if (!token) return

    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], deleting: true }
    }))

    try {
      const response = await fetch(`/api/settings/api-keys?service=${service}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh API keys
        await fetchApiKeys()
      } else {
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], deleting: false, testStatus: "error", testMessage: data.error || "Failed to delete API key" }
        }))
      }
    } catch {
      setApiKeyStates(prev => ({
        ...prev,
        [service]: { ...prev[service], deleting: false, testStatus: "error", testMessage: "Failed to delete API key" }
      }))
    }
  }

  // Update API key input value
  const updateApiKeyValue = (service: ApiKeyService, value: string) => {
    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], value, testStatus: "idle", testMessage: "" }
    }))
  }

  // Toggle password visibility
  const toggleShowPassword = (service: ApiKeyService) => {
    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], showPassword: !prev[service].showPassword }
    }))
  }

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    const token = getToken()
    if (!token) return

    setPreferencesLoading(true)
    setPreferencesError(null)

    try {
      const response = await fetch("/api/preferences", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch preferences")
      }

      const data = await response.json()
      const prefs = data.preferences
      setPreferences(prefs)
      setOriginalPreferences(prefs)
    } catch (error) {
      console.error("Error fetching preferences:", error)
      setPreferencesError("Failed to load preferences")
    } finally {
      setPreferencesLoading(false)
    }
  }, [getToken])

  // Save user preferences
  const savePreferences = async () => {
    const token = getToken()
    if (!token) return

    setPreferencesSaving(true)
    setPreferencesSaveStatus("idle")

    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      const data = await response.json()
      setPreferences(data.preferences)
      setOriginalPreferences(data.preferences)
      setPreferencesSaveStatus("success")

      // Clear success status after 3 seconds
      setTimeout(() => setPreferencesSaveStatus("idle"), 3000)
    } catch (error) {
      console.error("Error saving preferences:", error)
      setPreferencesSaveStatus("error")
    } finally {
      setPreferencesSaving(false)
    }
  }

  // Check if preferences have changed
  const preferencesChanged = originalPreferences !== null && (
    preferences.language !== originalPreferences.language ||
    preferences.detailLevel !== originalPreferences.detailLevel ||
    preferences.preferredModel !== originalPreferences.preferredModel ||
    preferences.thinkingMode !== originalPreferences.thinkingMode
  )

  // Fetch API keys when tab becomes active
  useEffect(() => {
    if (isAuthenticated && activeTab === "api-keys") {
      fetchApiKeys()
    }
  }, [isAuthenticated, activeTab, fetchApiKeys])

  // Fetch preferences when tab becomes active
  useEffect(() => {
    if (isAuthenticated && activeTab === "preferences") {
      fetchPreferences()
    }
  }, [isAuthenticated, activeTab, fetchPreferences])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything while redirecting
  if (!isAuthenticated) {
    return null
  }

  const renderApiKeysTab = () => {
    if (apiKeysLoading) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading API keys...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (apiKeysError) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-destructive">{apiKeysError}</p>
              <Button onClick={fetchApiKeys} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {API_KEY_SERVICES.map((service) => {
          const keyInfo = apiKeys[service]
          const state = apiKeyStates[service] || {
            value: "",
            showPassword: false,
            testing: false,
            testStatus: "idle",
            testMessage: "",
            saving: false,
            deleting: false,
          }

          return (
            <Card key={service}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{keyInfo?.displayName || service}</CardTitle>
                    {keyInfo?.configured && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Current key: <code className="text-xs bg-muted px-1 py-0.5 rounded">{keyInfo.masked}</code>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {keyInfo?.configured ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Configured
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                        Not configured
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`${service}-key`}>
                    {keyInfo?.configured ? "Update API Key" : "Enter API Key"}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${service}-key`}
                        type={state.showPassword ? "text" : "password"}
                        value={state.value}
                        onChange={(e) => updateApiKeyValue(service, e.target.value)}
                        placeholder={keyInfo?.configured ? "Enter new key to update" : "Enter API key"}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowPassword(service)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {state.showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status message */}
                {state.testStatus !== "idle" && (
                  <div className={`flex items-center gap-2 text-sm ${
                    state.testStatus === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}>
                    {state.testStatus === "success" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {state.testMessage}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testApiKey(service)}
                    disabled={!state.value.trim() || state.testing || state.saving}
                  >
                    {state.testing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveApiKey(service)}
                    disabled={!state.value.trim() || state.saving || state.testing}
                  >
                    {state.saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                  {keyInfo?.configured && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteApiKey(service)}
                      disabled={state.deleting || state.saving || state.testing}
                    >
                      {state.deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "api-keys":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage your API keys for Supadata, Z.AI, and fallback models. Keys are stored encrypted.
                </CardDescription>
              </CardHeader>
            </Card>
            {renderApiKeysTab()}
          </div>
        )
      case "preferences": {
        if (preferencesLoading) {
          return (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading preferences...</p>
                </div>
              </CardContent>
            </Card>
          )
        }

        if (preferencesError) {
          return (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-destructive">{preferencesError}</p>
                  <Button onClick={fetchPreferences} variant="outline">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }

        const selectedModel = MODELS.find(m => m.id === preferences.preferredModel)

        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your default settings for summary generation. These settings will be applied when you generate new summaries.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Language Selector */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Output Language</CardTitle>
                </div>
                <CardDescription>
                  Choose the language for generated summaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={preferences.language}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Detail Level Slider */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Default Detail Level</CardTitle>
                <CardDescription>
                  Set the default level of detail for new summaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DetailSlider
                  value={preferences.detailLevel}
                  onChange={(value) => setPreferences(prev => ({ ...prev, detailLevel: value }))}
                />
              </CardContent>
            </Card>

            {/* Model Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Default AI Model</CardTitle>
                <CardDescription>
                  Choose the default model for generating summaries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={preferences.preferredModel}
                  onValueChange={(value) => setPreferences(prev => ({ ...prev, preferredModel: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Thinking Mode Toggle - only shown when GLM-4.7 is selected */}
                {selectedModel?.supportsThinking && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-secondary">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <div>
                        <span className="text-sm font-medium">Default Thinking Mode</span>
                        <p className="text-xs text-muted-foreground">
                          Enable enhanced reasoning for complex content by default
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences.thinkingMode}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, thinkingMode: checked }))}
                      aria-label="Toggle default thinking mode"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {preferencesSaveStatus === "success" && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Preferences saved
                  </span>
                )}
                {preferencesSaveStatus === "error" && (
                  <span className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Failed to save preferences
                  </span>
                )}
              </div>
              <Button
                onClick={savePreferences}
                disabled={!preferencesChanged || preferencesSaving}
              >
                {preferencesSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </div>
          </div>
        )
      }
      case "prompt-templates":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Prompt Templates</CardTitle>
              <CardDescription>
                Create and manage custom prompt templates for summary generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Prompt template management will be implemented in the next update.
              </p>
            </CardContent>
          </Card>
        )
      case "usage":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>
                View your API usage statistics and history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Usage statistics will be implemented in the next update.
              </p>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Back to home</span>
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Manage your account settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Tab navigation - vertical on desktop, horizontal on mobile */}
          <nav className="md:w-64 shrink-0">
            {/* Mobile: horizontal scrollable tabs */}
            <div className="md:hidden overflow-x-auto">
              <div className="flex gap-2 pb-2">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className="shrink-0"
                  >
                    {tab.icon}
                    <span className="ml-2">{tab.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Desktop: vertical tabs */}
            <div className="hidden md:block space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {tab.icon}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{tab.label}</div>
                    <div className={`text-xs truncate ${
                      activeTab === tab.id
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </nav>

          {/* Tab content */}
          <main className="flex-1 min-w-0">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  )
}
