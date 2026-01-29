"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { AVAILABLE_LANGUAGES } from "@/lib/youtube"
import { Badge } from "@/components/ui/badge"
import { MobileSidebar } from "@/components/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { Youtube, Clock, Headphones, Search, History, Loader2 } from "lucide-react"
import { containerVariants, itemVariants, cardHover } from "@/lib/animations"

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
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchSummaries = async () => {
      try {
        const response = await fetch("/api/history", {
          credentials: "include",
        })
        if (!response.ok) {
          throw new Error("Failed to fetch summaries")
        }
        const data = await response.json()
        setSummaries(data.summaries)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load summaries")
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()
  }, [isAuthenticated])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getLanguageDisplay = (code: string) => {
    const entry = Object.entries(AVAILABLE_LANGUAGES).find(
      ([, langCode]) => langCode === code
    )
    return entry ? entry[0] : code
  }

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

  const filteredSummaries = summaries.filter((summary) => {
    return summary.title.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen gradient-soft-animated flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen gradient-soft-animated p-4 md:p-8">
        <MobileSidebar />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              Summary
              <span className="text-gradient"> History</span>
            </h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-video rounded-xl skeleton-shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen gradient-soft-animated p-4 md:p-8">
        <MobileSidebar />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
              Summary
              <span className="text-gradient"> History</span>
            </h1>
          </div>
          <div className="card-elevated p-8 text-center">
            <div className="text-destructive">
              {error}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-soft-animated p-4 md:p-8">
      <MobileSidebar />

      <motion.div
        className="max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">
            Summary
            <span className="text-gradient"> History</span>
          </h1>
          <p className="text-slate-500 mt-3 text-base max-w-md mx-auto">
            Browse and manage your previously generated video summaries
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="card-elevated p-6 md:p-8">
            <div className="space-y-6">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search summaries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

            </div>
          </div>
        </motion.div>

        {/* Summary Grid */}
        {filteredSummaries.length === 0 ? (
          <motion.div variants={itemVariants}>
            <div className="card-elevated p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">
                {searchQuery
                  ? "No summaries match your search"
                  : "No summaries yet. Try summarizing some videos!"}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSummaries.map((summary, index) => {
              const thumbnailUrl = `https://img.youtube.com/vi/${summary.videoId}/mqdefault.jpg`

              return (
                <motion.div
                  key={summary.id}
                  variants={itemVariants}
                  custom={index}
                >
                  <Link href={`/history/${summary.id}`}>
                    <motion.div
                      className="group relative rounded-xl overflow-hidden glass border border-border hover:border-accent-primary/50 transition-all"
                      whileHover={cardHover}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video">
                        <img
                          src={thumbnailUrl}
                          alt={summary.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://img.youtube.com/vi/${summary.videoId}/default.jpg`
                          }}
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                        {/* Mode Badge */}
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant="secondary"
                            className="bg-black/50 backdrop-blur-sm text-white border-0"
                          >
                            {summary.mode === "podcast" ? (
                              <Headphones className="h-3 w-3 mr-1" />
                            ) : (
                              <Youtube className="h-3 w-3 mr-1" />
                            )}
                            {summary.mode === "podcast" ? "Podcast" : "Video"}
                          </Badge>
                        </div>

                        {/* Title overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h2 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-white/90 transition-colors">
                            {cleanTitle(summary.title)}
                          </h2>
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="p-3 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(summary.createdAt)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getLanguageDisplay(summary.language)}
                        </Badge>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
