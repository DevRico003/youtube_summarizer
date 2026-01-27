"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Youtube, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AVAILABLE_LANGUAGES, extractVideoId } from "@/lib/youtube"
import { ModelSelector } from "@/components/ModelSelector"

export default function Home() {
  const [url, setUrl] = useState("")
  const [language, setLanguage] = useState("English")
  const [mode, setMode] = useState<"video" | "podcast">("video")
  const [aiModel, setAiModel] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const videoId = extractVideoId(url)
      const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`
      const encodedUrl = btoa(cleanUrl).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
      const summaryUrl = `/summary/${encodedUrl}?lang=${AVAILABLE_LANGUAGES[language as keyof typeof AVAILABLE_LANGUAGES]}&mode=${mode}&model=${aiModel}`
      router.push(summaryUrl)
    } catch (error) {
      alert("Invalid YouTube URL. Please enter a valid YouTube URL.")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">YouTube AI Summarizer</CardTitle>
          <CardDescription className="text-center">Enter a YouTube URL to get an AI-generated summary</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value.replace(/^@/, ""))}
                placeholder="https://youtube.com/watch?v=..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(AVAILABLE_LANGUAGES).map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mode} onValueChange={(value) => setMode(value as "video" | "podcast")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center">
                      <Youtube className="mr-2 h-4 w-4" />
                      <span>Video Summary</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="podcast">
                    <div className="flex items-center">
                      <Headphones className="mr-2 h-4 w-4" />
                      <span>Podcast Style</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ModelSelector
              value={aiModel}
              onChange={(model: string) => setAiModel(model)}
            />

            <Button type="submit" className="w-full">
              Generate Summary
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

