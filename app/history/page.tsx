"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AVAILABLE_LANGUAGES } from "@/lib/youtube"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Youtube, Clock, Headphones } from "lucide-react"

interface Summary {
  id: string
  videoId: string
  title: string
  content: string
  language: string
  createdAt: Date
  updatedAt: Date
  mode: string
  source: string | null
}

export default function HistoryPage() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummaries = async () => {
      try {
        const response = await fetch('/api/history')
        if (!response.ok) {
          throw new Error('Failed to fetch summaries')
        }
        const data = await response.json()
        setSummaries(data.summaries)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load summaries')
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()
  }, [])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLanguageDisplay = (code: string) => {
    const entry = Object.entries(AVAILABLE_LANGUAGES).find(([_, langCode]) => langCode === code)
    return entry ? entry[0] : code
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Summary History</h1>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-3" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1/3 text-right">Processing Video</div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[45%] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <Skeleton className="h-3 w-3" />
                    <span className="text-muted-foreground">Analyzing video content...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Skeleton className="h-3 w-3" />
                    <span className="text-muted-foreground">Generating summary sections...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Skeleton className="h-3 w-3" />
                    <span className="text-muted-foreground">Creating final summary...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Skeleton className="h-3 w-3" />
                    <span className="text-muted-foreground">Saving to history...</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent>
            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">{error}</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Summary History</h1>
      <div className="space-y-4">
        {summaries.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">No summaries yet. Try summarizing some videos!</p>
            </CardContent>
          </Card>
        ) : (
          summaries.map((summary) => (
            <Link href={`/history/${summary.id}`} key={summary.id}>
              <Card className="hover:bg-accent transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold line-clamp-1">{summary.title}</h2>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Youtube className="h-4 w-4 mr-1" />
                        <span className="truncate">{summary.videoId}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {summary.mode === "podcast" ? <Headphones className="h-3 w-3" /> : <Youtube className="h-3 w-3" />}
                        {summary.mode === "podcast" ? "Podcast" : "Video"}
                      </Badge>
                      <Badge variant="outline">{getLanguageDisplay(summary.language)}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                        <Clock className="h-4 w-4 mr-1" />
                        <time>{formatDate(summary.createdAt)}</time>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

