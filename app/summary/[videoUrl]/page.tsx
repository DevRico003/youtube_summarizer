"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { use } from "react";
import ReactMarkdown from "react-markdown";
import { Play, AlertCircle, X, Edit3, Check, Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressStages, type Stage } from "@/components/ProgressStages";
import { Timeline } from "@/components/Timeline";
import { ChapterLinks } from "@/components/ChapterLinks";
import { TopicEditor } from "@/components/TopicEditor";
import { extractVideoId } from "@/lib/youtube";
import { useAuth } from "@/contexts/AuthContext";
import { generateMarkdown } from "@/lib/exportMarkdown";

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
  const [showTopicEditor, setShowTopicEditor] = useState(false);
  const [editedTopics, setEditedTopics] = useState<Topic[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { isAuthenticated } = useAuth();
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
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Thumbnail placeholder */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center md:max-w-md">
            <div className="text-muted-foreground text-sm">Loading video...</div>
          </div>

          {/* Progress Stages */}
          <Card className="md:max-w-md">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Generating Summary</h2>
              <ProgressStages currentStage={currentStage} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Save topics via API
  const handleTopicSave = async (topics: Topic[]) => {
    if (!summary?.id || !isAuthenticated) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/topics/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          summaryId: summary.id,
          topics: topics.map((t) => ({
            topicId: t.id,
            customTitle: t.title,
            customStartMs: t.startMs,
            customEndMs: t.endMs,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save topics");
      }

      // Update local state with edited topics
      setEditedTopics(topics);
      setSaveSuccess(true);

      // Clear success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving topics:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save topic edits"
      );
      setErrorDismissed(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Get the topics to display (edited or original)
  const displayTopics = editedTopics || summary?.topics || [];

  // Handle export to markdown
  const handleExport = () => {
    if (!summary || !videoId) return;

    const markdown = generateMarkdown(
      { title: summary.title, content: summary.content },
      displayTopics,
      videoId
    );

    // Create a blob and trigger download
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${videoId}-summary.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 transition-all duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Error Toast (inline) */}
        {error && !errorDismissed && (
          <div className="bg-destructive/15 border border-destructive/30 text-destructive px-4 py-3 rounded-lg flex items-start gap-3 mb-4">
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

        {/* Video Title - Full width on both mobile and desktop */}
        {summary?.title && (
          <h1 className="text-xl md:text-2xl font-bold mb-4 transition-all duration-300">
            {summary.title}
          </h1>
        )}

        {/* Desktop: Two-column layout / Mobile: Vertical stack */}
        <div className="flex flex-col md:flex-row md:gap-6 transition-all duration-300">
          {/* Left Column: Thumbnail + Timeline + Topic Editor (for future) */}
          <div className="md:w-[400px] md:flex-shrink-0 space-y-4 transition-all duration-300">
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
                  className="w-full h-full object-cover transition-transform duration-300"
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

            {/* Timeline (conditional - only when hasTimestamps) */}
            {summary?.hasTimestamps && displayTopics.length > 0 && videoDuration > 0 && (
              <div className="py-2 transition-all duration-300">
                <Timeline
                  topics={displayTopics}
                  videoDuration={videoDuration}
                  videoId={videoId}
                />
              </div>
            )}

            {/* Edit Topics Button - Mobile, when authenticated and hasTimestamps */}
            {summary?.hasTimestamps && displayTopics.length > 0 && videoDuration > 0 && isAuthenticated && (
              <div className="md:hidden">
                <Button
                  variant={showTopicEditor ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowTopicEditor(!showTopicEditor)}
                  className="w-full"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {showTopicEditor ? "Hide Topic Editor" : "Edit Topics"}
                </Button>
              </div>
            )}

            {/* Topic Editor - Mobile, toggleable */}
            {summary?.hasTimestamps && displayTopics.length > 0 && videoDuration > 0 && showTopicEditor && (
              <Card className="md:hidden transition-all duration-300">
                <CardContent className="pt-6">
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
                      <Check className="w-4 h-4" />
                      Topics saved successfully!
                    </div>
                  )}
                  <TopicEditor
                    topics={displayTopics}
                    videoDuration={videoDuration}
                    onSave={handleTopicSave}
                  />
                </CardContent>
              </Card>
            )}

            {/* Topic Editor - Desktop only, when authenticated and hasTimestamps */}
            {summary?.hasTimestamps && displayTopics.length > 0 && videoDuration > 0 && isAuthenticated && (
              <Card className="hidden md:block transition-all duration-300">
                <CardContent className="pt-6">
                  {isSaving && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
                      <Check className="w-4 h-4" />
                      Topics saved successfully!
                    </div>
                  )}
                  <TopicEditor
                    topics={displayTopics}
                    videoDuration={videoDuration}
                    onSave={handleTopicSave}
                  />
                </CardContent>
              </Card>
            )}

            {/* Back Button - Desktop: in left column */}
            <div className="hidden md:block pt-4 transition-all duration-300">
              <Button variant="outline" asChild>
                <a href="/">← Back to Home</a>
              </Button>
            </div>
          </div>

          {/* Right Column: Chapter Links + Summary Content */}
          <div className="flex-1 space-y-4 mt-4 md:mt-0 transition-all duration-300">
            {/* Chapter Links */}
            {displayTopics.length > 0 && (
              <Card className="transition-all duration-300">
                <CardContent className="pt-6">
                  <ChapterLinks topics={displayTopics} videoId={videoId} />
                </CardContent>
              </Card>
            )}

            {/* Summary Content */}
            {summary?.content && (
              <Card className="transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Summary
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{summary.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Back Button - Mobile only */}
            <div className="md:hidden pt-4 transition-all duration-300">
              <Button variant="outline" asChild>
                <a href="/">← Back to Home</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
