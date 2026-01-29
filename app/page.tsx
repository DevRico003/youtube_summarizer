"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Loader2, Sparkles, Play, Zap, Clock, BookOpen, ArrowRight } from "lucide-react"
import { extractVideoId } from "@/lib/youtube"
import { MobileSidebar } from "@/components/sidebar"
import { UrlInputEnhanced } from "@/components/url-input-enhanced"
import { ModelDropdown } from "@/components/model-dropdown"
import { LanguageDropdown, getDefaultLanguage, type OutputLanguage } from "@/components/language-dropdown"
import { GlassCard } from "@/components/ui/glass-card"
import { useAuth } from "@/hooks/useAuth"
import { containerVariants, itemVariants } from "@/lib/animations"

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [url, setUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [language, setLanguage] = useState<OutputLanguage>("en")
  const [urlError, setUrlError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUrlValid, setIsUrlValid] = useState(false)
  const router = useRouter()

  // Set default language based on browser
  useEffect(() => {
    setLanguage(getDefaultLanguage())
  }, [])

  // Redirect to setup if authenticated but setup not completed
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.setupCompleted) {
      router.replace("/setup")
    }
  }, [authLoading, isAuthenticated, user, router])

  const validateUrl = (inputUrl: string): boolean => {
    if (!inputUrl.trim()) {
      setUrlError("Please enter a YouTube URL")
      setIsUrlValid(false)
      return false
    }

    try {
      extractVideoId(inputUrl)
      setUrlError("")
      setIsUrlValid(true)
      return true
    } catch {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube video URL.")
      setIsUrlValid(false)
      return false
    }
  }

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    if (urlError && newUrl) {
      validateUrl(newUrl)
    } else if (!newUrl) {
      setUrlError("")
      setIsUrlValid(false)
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
      const encodedUrl = btoa(cleanUrl)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")

      const params = new URLSearchParams({
        detail: "5",
        model: aiModel,
        lang: language,
      })

      const summaryUrl = `/summary/${encodedUrl}?${params.toString()}`
      router.push(summaryUrl)
    } catch {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube URL.")
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen gradient-soft-animated flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    )
  }

  // Landing page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-soft-animated">
        <div className="min-h-screen p-4 md:p-8 lg:p-12 flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="YT Summarizer Logo"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-display text-xl font-semibold text-slate-900">
                YT Summarizer
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-accent-primary to-accent-secondary rounded-lg hover:opacity-90 transition-opacity"
              >
                Create account
              </Link>
            </div>
          </header>

          {/* Hero Section */}
          <motion.div
            className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
                Transform YouTube videos into
                <span className="text-gradient"> intelligent summaries</span>
              </h1>
              <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-8">
                Get AI-powered chapter-based summaries with timestamps, topic detection, and multi-language support. Save hours of watching time.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-accent-primary to-accent-secondary rounded-xl hover:opacity-90 transition-opacity shadow-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </motion.div>

            {/* Features Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              <GlassCard variant="default" className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  AI-Powered Analysis
                </h3>
                <p className="text-sm text-slate-500">
                  Choose from multiple LLM providers including Claude, Gemini, and GLM for intelligent summarization.
                </p>
              </GlassCard>

              <GlassCard variant="default" className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-500/5 flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-teal-500" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  Chapter Detection
                </h3>
                <p className="text-sm text-slate-500">
                  Automatically detect topics and chapters with precise timestamps for easy navigation.
                </p>
              </GlassCard>

              <GlassCard variant="default" className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-violet-500" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900 mb-2">
                  Multi-Language
                </h3>
                <p className="text-sm text-slate-500">
                  Generate summaries in your preferred language, regardless of the video&apos;s original language.
                </p>
              </GlassCard>
            </motion.div>

            {/* Demo Preview */}
            <motion.div variants={itemVariants} className="mt-12 w-full">
              <GlassCard variant="elevated" className="p-6 md:p-8 opacity-75">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-sm mb-4">
                    <Play className="w-4 h-4" />
                    Preview
                  </div>
                  <p className="text-slate-400 mb-4">
                    Create an account to start summarizing YouTube videos
                  </p>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent z-10 rounded-xl" />
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="h-12 bg-slate-100 rounded-lg mb-4 animate-pulse" />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  // Main app for authenticated users with completed setup
  return (
    <div className="min-h-screen gradient-soft-animated">
      <MobileSidebar />

      <div className="min-h-screen p-4 md:p-8 lg:p-12 flex flex-col items-center justify-center">
        <motion.div
          className="max-w-xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-col items-center justify-center space-y-8">
            {/* Headline */}
            <motion.div variants={itemVariants} className="text-center">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
                YouTube
                <span className="text-gradient"> Summarizer</span>
              </h1>
              <p className="text-slate-500 mt-4 text-lg">
                Transform any YouTube video into a concise, chapter-based summary with intelligent topic detection
              </p>
            </motion.div>

            {/* Action Card */}
            <motion.div variants={itemVariants} className="w-full">
              <div className="card-elevated p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* URL Input */}
                  <UrlInputEnhanced
                    value={url}
                    onChange={handleUrlChange}
                    onBlur={handleUrlBlur}
                    error={urlError}
                    isLoading={isSubmitting}
                    isValid={isUrlValid && !urlError}
                    disabled={isSubmitting}
                  />

                  {/* Model & Language Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Model Selector */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        AI Model
                      </label>
                      <ModelDropdown
                        value={aiModel}
                        onChange={setAiModel}
                      />
                    </div>

                    {/* Language Selector */}
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Summary Language
                      </label>
                      <LanguageDropdown
                        value={language}
                        onChange={setLanguage}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || !url.trim()}
                    className="w-full relative overflow-hidden group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-100 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-3 px-8 py-4 text-white font-semibold text-lg">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Summarize Video</span>
                        </>
                      )}
                    </div>
                  </motion.button>
                </form>
              </div>

            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
