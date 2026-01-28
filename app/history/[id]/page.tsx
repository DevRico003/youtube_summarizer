"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { use } from "react"
import ReactMarkdown from "react-markdown"
import { motion, AnimatePresence } from "framer-motion"
import {
  Play,
  AlertCircle,
  X,
  Download,
  ArrowLeft,
  FileText,
  Layers,
  Star,
  ExternalLink,
  BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileSidebar } from "@/components/sidebar"
import { ChapterTimeline } from "@/components/chapter-timeline"
import { TranscriptWithTimestamps } from "@/components/transcript-with-timestamps"
import {
  CollapsibleChapter,
  parseSummaryContent,
  getChapterColor,
  type ParsedSummary,
} from "@/components/collapsible-chapter"
import { generateMarkdown } from "@/lib/exportMarkdown"
import { containerVariants, itemVariants } from "@/lib/animations"
import { cn } from "@/lib/utils"

interface Topic {
  id: string
  title: string
  startMs: number
  endMs: number
  order: number
}

interface TranscriptSegment {
  id: string
  text: string
  offset: number
  duration: number
  order: number
}

interface Summary {
  id: string
  videoId: string
  title: string
  content: string
  language: string
  createdAt: string
  topics: Topic[]
  transcriptSegments: TranscriptSegment[]
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function HistoryDetailPage({ params }: PageProps) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [activeTab, setActiveTab] = useState<"chapters" | "transcript">("chapters")
  const [showFullSummary, setShowFullSummary] = useState(false)
  const router = useRouter()
  const { id } = use(params)

  const parsedSummary = useMemo<ParsedSummary | null>(() => {
    if (!summary?.content) return null
    return parseSummaryContent(summary.content)
  }, [summary?.content])

  const useStructuredView = parsedSummary && parsedSummary.chapters.length > 0

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)
        setErrorDismissed(false)

        const token = localStorage.getItem("token")
        const response = await fetch(`/api/history/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          throw new Error("Failed to fetch summary")
        }
        const data = await response.json()
        setSummary(data.summary)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load summary")
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [id])

  const videoId = summary?.videoId || ""
  const youtubeUrl = videoId
    ? `https://www.youtube.com/watch?v=${videoId}`
    : ""
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : ""

  const displayTopics = summary?.topics || []

  const cleanTitle = (title: string) => {
    let cleaned = title

    // Common translations of "Title" in various languages (case insensitive)
    const titleVariants = [
      "title",      // English
      "titel",      // German, Dutch, Swedish, Norwegian, Danish
      "titre",      // French
      "título",     // Spanish, Portuguese
      "titulo",     // Spanish, Portuguese (without accent)
      "titolo",     // Italian
      "название",   // Russian
      "заголовок",  // Russian
      "标题",       // Chinese Simplified
      "標題",       // Chinese Traditional
      "タイトル",   // Japanese
      "題名",       // Japanese
      "제목",       // Korean
      "타이틀",     // Korean
      "tytuł",      // Polish
      "tytul",      // Polish (without accent)
      "otsikko",    // Finnish
      "nimi",       // Finnish
      "rubrik",     // Swedish
      "tittel",     // Norwegian
      "cím",        // Hungarian
      "titul",      // Czech, Slovak
      "název",      // Czech
      "nadpis",     // Slovak, Croatian
      "naslov",     // Croatian, Slovenian
      "titlu",      // Romanian
      "τίτλος",     // Greek
      "titlos",     // Greek (latinized)
      "başlık",     // Turkish
      "baslik",     // Turkish (without accent)
      "כותרת",      // Hebrew
      "عنوان",      // Arabic
      "titulli",    // Albanian
      "sarlavha",   // Uzbek
      "sarvlavha",  // Uzbek
      "ຫົວຂໍ້",       // Lao
      "หัวข้อ",      // Thai
      "tiêu đề",    // Vietnamese
      "tieude",     // Vietnamese (without accent)
      "pamagat",    // Filipino
      "judul",      // Indonesian, Malay
      "શીર્ષક",      // Gujarati
      "শিরোনাম",    // Bengali
      "ಶೀರ್ಷಿಕೆ",   // Kannada
      "തലക്കെട്ട്", // Malayalam
      "शीर्षक",     // Hindi, Marathi
      "শীৰ্ষক",     // Assamese
      "ਪਸ਼ਕਸ਼ਰ",      // Punjabi
      "தலைப்பு",    // Tamil
      "తలకట్టు",    // Telugu
    ]

    // Build regex pattern for any title variant with optional markdown and colon
    const titlePattern = titleVariants.join("|")

    // Remove **Title:** or **Title** at the start (with optional colon)
    const markdownRegex = new RegExp(
      `^\\*\\*(?:${titlePattern})\\*\\*[:\\s]*`,
      "i"
    )
    cleaned = cleaned.replace(markdownRegex, "")

    // Remove *Title:* or *Title* at the start (single asterisk)
    const singleMarkdownRegex = new RegExp(
      `^\\*(?:${titlePattern})\\*[:\\s]*`,
      "i"
    )
    cleaned = cleaned.replace(singleMarkdownRegex, "")

    // Remove Title: or Title at the start (without markdown)
    const plainRegex = new RegExp(`^(?:${titlePattern})[:\\s]+`, "i")
    cleaned = cleaned.replace(plainRegex, "")

    // Remove all remaining ** (bold markers)
    cleaned = cleaned.replace(/\*\*/g, "")
    // Remove * markers (italic) but keep the text inside
    cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1")
    // Remove any remaining single * at start
    cleaned = cleaned.replace(/^\*\s*/, "")

    return cleaned.trim()
  }

  const handleExport = () => {
    if (!summary || !videoId) return

    const markdown = generateMarkdown(
      { title: summary.title, content: summary.content },
      displayTopics,
      videoId
    )

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${videoId}-summary.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen gradient-soft p-4 md:p-8">
        <MobileSidebar />
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div className="aspect-video rounded-2xl skeleton-shimmer" />
              <div className="h-64 rounded-xl skeleton-shimmer" />
            </div>
            <div className="lg:col-span-3 h-96 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-soft">
      <MobileSidebar />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-full"
              onClick={() => router.push("/history")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Button>

            <div className="flex items-center gap-2">
              {useStructuredView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-full"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {showFullSummary ? "Structured View" : "Full Text"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={!summary}
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 lg:p-8">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Error Toast */}
          <AnimatePresence>
            {error && !errorDismissed && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Grid - Left: Video+Chapters, Right: Summary */}
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Column - Video & Chapters/Transcript */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
              {/* Video Thumbnail Card */}
              {videoId && (
                <div className="card-elevated overflow-hidden">
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video group"
                  >
                    <img
                      src={thumbnailUrl}
                      alt={summary?.title || "Video thumbnail"}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        if (target.src.includes("maxresdefault")) {
                          target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        }
                      }}
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="w-7 h-7 text-indigo-600 fill-indigo-600 ml-0.5" />
                      </motion.div>
                    </div>

                    {/* Title overlay */}
                    {summary?.title && (
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h1 className="font-semibold text-white text-base md:text-lg line-clamp-2 drop-shadow-lg">
                          {cleanTitle(summary.title)}
                        </h1>
                      </div>
                    )}
                  </a>
                </div>
              )}

              {/* Chapters & Transcript Tabs */}
              <div className="card-soft">
                {/* Tab Headers */}
                <div className="flex border-b border-slate-100">
                  <button
                    onClick={() => setActiveTab("chapters")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                      activeTab === "chapters"
                        ? "text-indigo-600 border-indigo-500"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    )}
                  >
                    <Layers className="w-4 h-4" />
                    Chapters
                    {displayTopics.length > 0 && (
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                        {displayTopics.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("transcript")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px",
                      activeTab === "transcript"
                        ? "text-indigo-600 border-indigo-500"
                        : "text-slate-500 border-transparent hover:text-slate-700"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    Transcript
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  <AnimatePresence mode="wait">
                    {activeTab === "chapters" ? (
                      <motion.div
                        key="chapters"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        {displayTopics.length > 0 ? (
                          <ChapterTimeline topics={displayTopics} videoId={videoId} variant="compact" />
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No chapters available</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="transcript"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                      >
                        <TranscriptWithTimestamps
                          segments={summary?.transcriptSegments || []}
                          topics={displayTopics}
                          videoId={videoId}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Summary Only */}
            <motion.div variants={itemVariants} className="lg:col-span-3">
              <div className="card-soft h-full">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900">Summary</h2>
                        <p className="text-xs text-slate-500">AI-generated insights</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {summary?.content ? (
                    useStructuredView && !showFullSummary ? (
                      <div className="space-y-6">
                        {parsedSummary.title && (
                          <h1 className="text-xl font-bold text-slate-900">
                            {parsedSummary.title}
                          </h1>
                        )}

                        {parsedSummary.overview && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-slate-600 leading-relaxed">
                              {parsedSummary.overview}
                            </p>
                          </div>
                        )}

                        {parsedSummary.recommendedChapters.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500" />
                              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                Recommended to Watch
                              </h3>
                            </div>
                            <div className="space-y-2">
                              {parsedSummary.recommendedChapters.map((rec, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100"
                                >
                                  <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    {rec.link ? (
                                      <a
                                        href={rec.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                                      >
                                        {rec.name}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="font-medium text-amber-700">{rec.name}</span>
                                    )}
                                    {rec.reason && (
                                      <p className="text-sm text-amber-600 mt-0.5">{rec.reason}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {parsedSummary.chapters.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-indigo-500" />
                              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                Chapter Summaries
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {parsedSummary.chapters.map((chapter, index) => (
                                <CollapsibleChapter
                                  key={index}
                                  title={chapter.title}
                                  timestamp={chapter.timestamp}
                                  youtubeLink={chapter.link}
                                  content={chapter.content + (chapter.transition ? `\n\n*${chapter.transition}*` : "")}
                                  index={index}
                                  color={getChapterColor(index)}
                                  defaultExpanded={index === 0}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {parsedSummary.conclusion && (
                          <div className="p-4 bg-gradient-to-r from-indigo-50 to-teal-50 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-indigo-500" />
                              <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">
                                Key Takeaways
                              </h3>
                            </div>
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown>{parsedSummary.conclusion}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{summary.content}</ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No summary available</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
