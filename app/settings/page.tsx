"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Settings, Key, ArrowLeft, Loader2, Check, AlertCircle, Trash2, Eye, EyeOff, ExternalLink, UserX } from "lucide-react"
import { AnimatedBackground } from "@/components/animated-background"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from "@/components/ui/glass-card"
import { containerVariants, itemVariants } from "@/lib/animations"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ApiKeyInfo {
  configured: boolean
  masked: string | null
  displayName: string
}

interface ApiKeyState {
  value: string
  showPassword: boolean
  saving: boolean
  deleting: boolean
}

const API_KEY_SERVICES = ["supadata", "zai"] as const
type ApiKeyService = typeof API_KEY_SERVICES[number]

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, logout } = useAuth()

  // API Keys state
  const [apiKeysLoading, setApiKeysLoading] = useState(true)

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [apiKeysError, setApiKeysError] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyInfo>>({})
  const [apiKeyStates, setApiKeyStates] = useState<Record<string, ApiKeyState>>({})

  const fetchApiKeys = useCallback(async () => {
    setApiKeysLoading(true)
    setApiKeysError(null)

    try {
      const response = await fetch("/api/settings/api-keys", {
        credentials: "include", // Include cookies for auth
      })

      if (!response.ok) throw new Error("Failed to fetch API keys")

      const data = await response.json()
      setApiKeys(data.keys)

      const initialStates: Record<string, ApiKeyState> = {}
      for (const service of API_KEY_SERVICES) {
        initialStates[service] = {
          value: "",
          showPassword: false,
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
  }, [])

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
        credentials: "include",
        body: JSON.stringify({ service, apiKey: state.value.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchApiKeys()
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], saving: false, value: "" }
        }))
      } else {
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], saving: false }
        }))
      }
    } catch {
      setApiKeyStates(prev => ({
        ...prev,
        [service]: { ...prev[service], saving: false }
      }))
    }
  }

  const deleteApiKey = async (service: ApiKeyService) => {
    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], deleting: true }
    }))

    try {
      const response = await fetch(`/api/settings/api-keys?service=${service}`, {
        method: "DELETE",
        credentials: "include",
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchApiKeys()
      } else {
        setApiKeyStates(prev => ({
          ...prev,
          [service]: { ...prev[service], deleting: false }
        }))
      }
    } catch {
      setApiKeyStates(prev => ({
        ...prev,
        [service]: { ...prev[service], deleting: false }
      }))
    }
  }

  const updateApiKeyValue = (service: ApiKeyService, value: string) => {
    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], value }
    }))
  }

  const toggleShowPassword = (service: ApiKeyService) => {
    setApiKeyStates(prev => ({
      ...prev,
      [service]: { ...prev[service], showPassword: !prev[service].showPassword }
    }))
  }

  const deleteAccount = async () => {
    if (deleteConfirmText !== "DELETE" || !deletePassword) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password: deletePassword }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await logout()
      } else {
        setDeleteError(data.error || "Failed to delete account")
        setIsDeleting(false)
      }
    } catch {
      setDeleteError("Failed to delete account")
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchApiKeys()
  }, [isAuthenticated, fetchApiKeys])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login")
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <>
        <AnimatedBackground intensity="low" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (!isAuthenticated) return null

  const getServiceInfo = (service: ApiKeyService) => {
    const info: Record<ApiKeyService, { description: string; url: string; urlLabel: string }> = {
      supadata: {
        description: "Fetch YouTube transcripts with timestamps",
        url: "https://supadata.ai/?ref=devrico003",
        urlLabel: "supadata.ai"
      },
      zai: {
        description: "GLM-4.7 model - Coding Plan or API Credit Mode",
        url: "https://z.ai/subscribe?ic=D7NHC27OHD",
        urlLabel: "z.ai"
      }
    }
    return info[service]
  }

  const renderApiKeysContent = () => {
    if (apiKeysLoading) {
      return (
        <GlassCardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            <p className="text-muted-foreground">Loading API keys...</p>
          </div>
        </GlassCardContent>
      )
    }

    if (apiKeysError) {
      return (
        <GlassCardContent className="py-8">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-destructive">{apiKeysError}</p>
            <Button onClick={fetchApiKeys} variant="outline">Try Again</Button>
          </div>
        </GlassCardContent>
      )
    }

    return (
      <GlassCardContent className="px-6 pt-6 pb-6">
        <div className="space-y-5">
          {API_KEY_SERVICES.map((service) => {
            const keyInfo = apiKeys[service]
            const serviceInfo = getServiceInfo(service)
            const state = apiKeyStates[service] || {
              value: "",
              showPassword: false,
              saving: false,
              deleting: false,
            }

            return (
              <div
                key={service}
                className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm"
              >
                {/* Service Header */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="font-semibold text-slate-900">
                    {keyInfo?.displayName || service}
                  </span>
                  {keyInfo?.configured ? (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      "bg-emerald-500/10 text-emerald-600"
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Configured
                    </span>
                  ) : (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                      "bg-slate-200/50 text-slate-500"
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Not configured
                    </span>
                  )}
                  {keyInfo?.masked && (
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono text-slate-500 truncate max-w-[120px] sm:max-w-none">
                      {keyInfo.masked}
                    </code>
                  )}
                </div>

                {/* Description and Link */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-slate-500">
                    {serviceInfo.description}
                  </p>
                  <a
                    href={serviceInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-primary hover:underline flex items-center gap-1"
                  >
                    {serviceInfo.urlLabel}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Input + Buttons */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      type={state.showPassword ? "text" : "password"}
                      value={state.value}
                      onChange={(e) => updateApiKeyValue(service, e.target.value)}
                      placeholder={keyInfo?.configured ? "Enter new key to update" : "Enter API key"}
                      className="pr-10 bg-white border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowPassword(service)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {state.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    size="default"
                    onClick={() => saveApiKey(service)}
                    disabled={!state.value.trim() || state.saving}
                    className="bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-white"
                  >
                    {state.saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Save</span>
                  </Button>
                  {keyInfo?.configured && (
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => deleteApiKey(service)}
                      disabled={state.deleting || state.saving}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {state.deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Delete</span>
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </GlassCardContent>
    )
  }

  return (
    <>
      <AnimatedBackground intensity="low" />
      <div className="min-h-screen p-4 md:p-8">
        <motion.div
          className="max-w-2xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
            <Link href="/">
              <Button variant="ghost" size="icon" className="hover:bg-white/50">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center shadow-lg shadow-accent-primary/20">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900">Settings</h1>
                <p className="text-sm text-slate-500 hidden sm:block">Manage your API keys</p>
              </div>
            </div>
          </motion.div>

          {/* API Keys Card */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="elevated">
              <GlassCardHeader className="px-6 py-6">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-accent-primary" />
                  <GlassCardTitle>API Keys</GlassCardTitle>
                </div>
                <GlassCardDescription>
                  Manage your API keys for transcript fetching and AI models. Keys are stored encrypted.
                </GlassCardDescription>
              </GlassCardHeader>
              {renderApiKeysContent()}
            </GlassCard>
          </motion.div>

          {/* Danger Zone */}
          <motion.div variants={itemVariants} className="mt-8">
            <GlassCard variant="elevated" className="border-red-200">
              <GlassCardHeader className="px-6 py-6">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-red-500" />
                  <GlassCardTitle className="text-red-600">Danger Zone</GlassCardTitle>
                </div>
                <GlassCardDescription>
                  Irreversible actions that will permanently affect your account.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="px-6 pb-6">
                <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-red-700">Delete Account</h3>
                      <p className="text-sm text-red-600 mt-1">
                        Permanently delete your account and all associated data including summaries, API keys, and settings.
                      </p>
                    </div>
                    {!showDeleteConfirm ? (
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="border-red-300 text-red-600 hover:bg-red-100 whitespace-nowrap"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-3 w-full sm:w-auto">
                        <div>
                          <p className="text-sm text-red-700 font-medium mb-2">
                            Enter your password to confirm:
                          </p>
                          <Input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Password"
                            className="border-red-300 focus:border-red-500 focus:ring-red-500 w-full sm:w-48"
                          />
                        </div>
                        <p className="text-sm text-red-700 font-medium">
                          Type <code className="bg-red-100 px-1.5 py-0.5 rounded">DELETE</code> to confirm:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="border-red-300 focus:border-red-500 focus:ring-red-500 w-32"
                          />
                          <Button
                            variant="destructive"
                            onClick={deleteAccount}
                            disabled={deleteConfirmText !== "DELETE" || !deletePassword || isDeleting}
                            className="whitespace-nowrap"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Confirm"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteConfirm(false)
                              setDeleteConfirmText("")
                              setDeletePassword("")
                              setDeleteError(null)
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {deleteError && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {deleteError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
