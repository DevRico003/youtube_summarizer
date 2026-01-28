"use client"

import { motion } from "framer-motion"
import { Check, Loader2, FileText, Brain, Sparkles, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export type Stage =
  | "fetching_transcript"
  | "analyzing_topics"
  | "generating_summary"
  | "building_timeline"

const STAGES: { id: Stage; label: string; icon: typeof FileText }[] = [
  { id: "fetching_transcript", label: "Fetching Transcript", icon: FileText },
  { id: "analyzing_topics", label: "Analyzing Topics", icon: Brain },
  { id: "generating_summary", label: "Generating Summary", icon: Sparkles },
  { id: "building_timeline", label: "Building Timeline", icon: Clock },
]

const LOADING_MESSAGES = [
  "Analyzing video content...",
  "Understanding key concepts...",
  "Extracting important details...",
  "Organizing information...",
  "Almost there...",
]

interface ProgressStagesEnhancedProps {
  currentStage: Stage | null
  className?: string
}

export function ProgressStagesEnhanced({
  currentStage,
  className,
}: ProgressStagesEnhancedProps) {
  const currentIndex = currentStage
    ? STAGES.findIndex((s) => s.id === currentStage)
    : -1

  return (
    <div className={cn("flex flex-col items-center space-y-6", className)}>
      {/* Progress stages */}
      <div className="w-full max-w-sm space-y-3">
        {STAGES.map((stage, index) => {
          const isCompleted = currentIndex > index
          const isCurrent = currentIndex === index
          const isPending = currentIndex < index
          const Icon = stage.icon

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border",
                isCompleted &&
                  "bg-emerald-50/80 border-emerald-200",
                isCurrent &&
                  "bg-indigo-50/80 border-indigo-200 shadow-sm shadow-indigo-100",
                isPending && "bg-white/60 border-slate-200 opacity-60"
              )}
            >
              {/* Status icon */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 transition-colors",
                  isCompleted && "bg-emerald-500",
                  isCurrent && "bg-indigo-500",
                  isPending && "bg-slate-100 border border-slate-200"
                )}
              >
                {isCompleted && <Check className="w-5 h-5 text-white" />}
                {isCurrent && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-5 h-5 text-white" />
                  </motion.div>
                )}
                {isPending && (
                  <Icon className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Stage info */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-emerald-700",
                    isCurrent && "text-indigo-700",
                    isPending && "text-slate-500"
                  )}
                >
                  {stage.label}
                </span>

                {/* Status text */}
                {isCompleted && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-emerald-600 mt-0.5"
                  >
                    Complete
                  </motion.p>
                )}
                {isCurrent && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-indigo-600 mt-0.5"
                  >
                    In progress...
                  </motion.p>
                )}
              </div>

              {/* Progress indicator for current */}
              {isCurrent && (
                <motion.div
                  className="w-2 h-2 rounded-full bg-indigo-500"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Typing animation for current status */}
      {currentStage && (
        <TypingText
          messages={LOADING_MESSAGES}
          className="text-sm text-slate-500"
        />
      )}
    </div>
  )
}

// Typing text animation component
function TypingText({
  messages,
  className,
}: {
  messages: string[]
  className?: string
}) {
  return (
    <motion.div
      className={cn("h-5 overflow-hidden", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        animate={{
          y: messages.map((_, i) => -i * 20),
        }}
        transition={{
          y: {
            duration: messages.length * 3,
            repeat: Infinity,
            ease: "linear",
          },
        }}
      >
        {messages.map((message, i) => (
          <div key={i} className="h-5 flex items-center">
            {message}
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}
