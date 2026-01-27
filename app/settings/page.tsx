"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, Key, Sliders, FileText, BarChart3, ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

type Tab = "api-keys" | "preferences" | "prompt-templates" | "usage"

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "api-keys":
        return (
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for Supadata, Z.AI, and fallback models.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                API key management will be implemented in the next update.
              </p>
            </CardContent>
          </Card>
        )
      case "preferences":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your default settings for summary generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Preferences management will be implemented in the next update.
              </p>
            </CardContent>
          </Card>
        )
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
