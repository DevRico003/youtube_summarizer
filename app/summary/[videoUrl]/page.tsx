"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import ReactMarkdown from "react-markdown";
import { Play, AlertCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressStages, type Stage } from "@/components/ProgressStages";
import { Timeline } from "@/components/Timeline";
import { ChapterLinks } from "@/components/ChapterLinks";
import { extractVideoId } from "@/lib/youtube";

interface Topic {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  order: number;
}

interface SummaryData {
  id: string;
  videoId: string;
  title: string;
  content: string;
  hasTimestamps: boolean;
  topics: Topic[];
  modelUsed: string;
  source: "cache" | "generated";
}

function urlSafeBase64Decode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const paddedBase64 = pad ? base64 + "=".repeat(4 - pad) : base64;
  return atob(paddedBase64);
}

interface PageProps {
  params: Promise<{ videoUrl: string }>;
}

export default function SummaryPage({ params }: PageProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [videoId, setVideoId] = useState<string>("");

  const searchParams = useSearchParams();
  const detailLevel = parseInt(searchParams.get("detail") || "3", 10);
  const { videoUrl } = use(params);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorDismissed(false);

        const url = urlSafeBase64Decode(videoUrl);

        // Extract video ID for thumbnail
        try {
          const id = extractVideoId(url);
          setVideoId(id);
        } catch {
          // Continue even if video ID extraction fails
        }

        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            detailLevel,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate summary");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Failed to read response stream");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line);

              if (data.type === "progress") {
                setCurrentStage(data.stage as Stage);
              } else if (data.type === "complete") {
                setSummary(data.summary);
                setCurrentStage(null);
                setVideoId(data.summary.videoId);
                break;
              } else if (data.type === "error") {
                throw new Error(data.error || "An error occurred");
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An error occurred while generating the summary"
        );
        setCurrentStage(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [videoUrl, detailLevel]);

  // Calculate video duration from topics
  const videoDuration =
    summary?.topics && summary.topics.length > 0
      ? Math.max(...summary.topics.map((t) => t.endMs))
      : 0;

  // YouTube URLs
  const youtubeUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : "";
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : "";

  // Loading state with ProgressStages
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Thumbnail placeholder */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading video...</div>
          </div>

          {/* Progress Stages */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Generating Summary</h2>
              <ProgressStages currentStage={currentStage} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Error Toast (inline) */}
        {error && !errorDismissed && (
          <div className="bg-destructive/15 border border-destructive/30 text-destructive px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button
              onClick={() => setErrorDismissed(true)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Dismiss error"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Video Thumbnail with Play Button */}
        {videoId && (
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative aspect-video rounded-lg overflow-hidden group"
          >
            <img
              src={thumbnailUrl}
              alt={summary?.title || "Video thumbnail"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to medium quality if maxresdefault fails
                const target = e.target as HTMLImageElement;
                if (target.src.includes("maxresdefault")) {
                  target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }
              }}
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </div>
          </a>
        )}

        {/* Video Title */}
        {summary?.title && (
          <h1 className="text-xl font-bold">{summary.title}</h1>
        )}

        {/* Timeline (conditional - only when hasTimestamps) */}
        {summary?.hasTimestamps && summary.topics.length > 0 && videoDuration > 0 && (
          <div className="py-2">
            <Timeline
              topics={summary.topics}
              videoDuration={videoDuration}
              videoId={videoId}
            />
          </div>
        )}

        {/* Chapter Links */}
        {summary?.topics && summary.topics.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <ChapterLinks topics={summary.topics} videoId={videoId} />
            </CardContent>
          </Card>
        )}

        {/* Summary Content */}
        {summary?.content && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Summary
              </h2>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{summary.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="pt-4">
          <Button variant="outline" asChild>
            <a href="/">← Back to Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
