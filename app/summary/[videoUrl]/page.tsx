"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AVAILABLE_LANGUAGES } from "@/lib/youtube"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Youtube, Headphones, Subtitles, Bot, Archive } from "lucide-react"
import { use } from "react"
import ReactMarkdown from 'react-markdown'

interface ProcessingStatus {
  currentChunk: number;
  totalChunks: number;
  stage: 'analyzing' | 'processing' | 'finalizing' | 'saving';
  message: string;
}

function urlSafeBase64Decode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const pad = base64.length % 4
  const paddedBase64 = pad ? base64 + "=".repeat(4 - pad) : base64
  return atob(paddedBase64)
}

interface PageProps {
  params: Promise<{ videoUrl: string }>
}

export default function SummaryPage({ params }: PageProps) {
  const [summary, setSummary] = useState<string>("")
  const [source, setSource] = useState<"youtube" | "cache" | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ProcessingStatus>({
    currentChunk: 0,
    totalChunks: 0,
    stage: 'analyzing',
    message: 'Analyzing video content...'
  })

  const searchParams = useSearchParams()
  const languageCode = searchParams.get("lang") || "en"
  const mode = (searchParams.get("mode") || "video") as "video" | "podcast"
  const aiModel = (searchParams.get("model") || "gemini") as "gemini" | "groq" | "gpt4"
  const { videoUrl } = use(params)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)

        const url = urlSafeBase64Decode(videoUrl)
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            language: languageCode,
            mode,
            aiModel
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to generate summary")
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("Failed to read response stream")
        }

        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          try {
            const data = JSON.parse(chunk)

            if (data.type === 'progress') {
              setStatus({
                currentChunk: data.currentChunk,
                totalChunks: data.totalChunks,
                stage: data.stage,
                message: data.message
              })
            } else if (data.type === 'complete') {
              setSummary(data.summary)
              setSource(data.source)
              break
            }
          } catch (e) {
            console.error('Error parsing chunk:', e)
          }
        }
      } catch (err) {
        console.error("Error fetching summary:", err)
        setError(err instanceof Error ? err.message : "An error occurred while generating the summary")
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [videoUrl, languageCode, mode, aiModel])

  const displayLanguage =
    Object.entries(AVAILABLE_LANGUAGES).find(([_, code]) => code === languageCode)?.[0] || "English"

  const getSourceIcon = () => {
    switch (source) {
      case "youtube":
        return <Subtitles className="h-4 w-4" />
      case "cache":
        return <Archive className="h-4 w-4" />
      default:
        return null
    }
  }

  const getSourceDisplay = () => {
    switch (source) {
      case "youtube":
        return "YouTube subtitles"
      case "cache":
        return "Cached summary"
      default:
        return ""
    }
  }

  if (loading) {
    const progress = status.totalChunks ? (status.currentChunk / status.totalChunks) * 100 : 0

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Generating Summary</CardTitle>
            <CardDescription>Please wait while we process your video</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{status.message}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${status.stage === 'analyzing' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                  <span className={status.stage === 'analyzing' ? 'text-primary' : 'text-muted-foreground'}>
                    Analyzing video content
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${status.stage === 'processing' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                  <span className={status.stage === 'processing' ? 'text-primary' : 'text-muted-foreground'}>
                    Processing chunks ({status.currentChunk}/{status.totalChunks})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${status.stage === 'finalizing' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                  <span className={status.stage === 'finalizing' ? 'text-primary' : 'text-muted-foreground'}>
                    Creating final summary
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${status.stage === 'saving' ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                  <span className={status.stage === 'saving' ? 'text-primary' : 'text-muted-foreground'}>
                    Saving to history
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span className="text-2xl font-bold flex items-center">
              {mode === "podcast" ? <Headphones className="mr-2" /> : <Youtube className="mr-2" />}
              {mode === "podcast" ? "Podcast-Style Summary" : "Video Summary"}
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{displayLanguage}</Badge>
              {source && (
                <Badge variant="outline" className="flex items-center">
                  {getSourceIcon()}
                  <span className="ml-1">{getSourceDisplay()}</span>
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">{error}</div>}

          {!loading && !error && (
            <div className="prose prose-sm sm:prose lg:prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

