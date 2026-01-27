"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Youtube, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { extractVideoId } from "@/lib/youtube"
import { ModelSelector } from "@/components/ModelSelector"
import { DetailSlider } from "@/components/DetailSlider"

export default function Home() {
  const [url, setUrl] = useState("")
  const [detailLevel, setDetailLevel] = useState(3)
  const [aiModel, setAiModel] = useState("")
  const [thinkingMode, setThinkingMode] = useState(false)
  const [urlError, setUrlError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const validateUrl = (inputUrl: string): boolean => {
    if (!inputUrl.trim()) {
      setUrlError("Please enter a YouTube URL")
      return false
    }

    try {
      extractVideoId(inputUrl)
      setUrlError("")
      return true
    } catch {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube video URL.")
      return false
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value.replace(/^@/, "")
    setUrl(newUrl)
    if (urlError && newUrl) {
      validateUrl(newUrl)
    } else if (!newUrl) {
      setUrlError("")
    }
  }

  const handleUrlBlur = () => {
    if (url) {
      validateUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateUrl(url)) {
      return
    }

    setIsSubmitting(true)

    try {
      const videoId = extractVideoId(url)
      const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
      const encodedUrl = btoa(cleanUrl).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

      const params = new URLSearchParams({
        detail: detailLevel.toString(),
        model: aiModel,
      })

      if (thinkingMode && aiModel === "glm-4.7") {
        params.set("thinking", "true")
      }

      const summaryUrl = `/summary/${encodedUrl}?${params.toString()}`
      router.push(summaryUrl)
    } catch {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube URL.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Youtube className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">YouTube Summarizer</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Get AI-powered summaries with topic timelines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <div className="space-y-2">
              <label htmlFor="url-input" className="text-sm font-medium">
                YouTube URL
              </label>
              <div className="relative">
                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="url-input"
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  onBlur={handleUrlBlur}
                  placeholder="https://youtube.com/watch?v=..."
                  className={`pl-10 h-12 ${urlError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  required
                  disabled={isSubmitting}
                  aria-describedby={urlError ? "url-error" : undefined}
                  aria-invalid={!!urlError}
                />
              </div>
              {urlError && (
                <p id="url-error" className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {urlError}
                </p>
              )}
            </div>

            {/* Detail Level Slider */}
            <DetailSlider
              value={detailLevel}
              onChange={setDetailLevel}
            />

            {/* Model Selector */}
            <ModelSelector
              value={aiModel}
              onChange={setAiModel}
              thinkingMode={thinkingMode}
              onThinkingModeChange={setThinkingMode}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isSubmitting || !url.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Summarize"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
