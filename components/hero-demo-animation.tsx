"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link2, Layers, FileText, Check, Play } from "lucide-react"
import { cn } from "@/lib/utils"

type DemoPhase = "url" | "chapters" | "summary" | "complete"

interface PhaseConfig {
  icon: typeof Link2
  title: string
  description: string
  color: string
}

const PHASES: Record<DemoPhase, PhaseConfig> = {
  url: {
    icon: Link2,
    title: "Paste URL",
    description: "Enter any YouTube video link",
    color: "from-slate-400 to-slate-500",
  },
  chapters: {
    icon: Layers,
    title: "Detect Chapters",
    description: "AI identifies key topics",
    color: "from-indigo-500 to-violet-500",
  },
  summary: {
    icon: FileText,
    title: "Generate Summary",
    description: "Comprehensive chapter breakdown",
    color: "from-teal-500 to-emerald-500",
  },
  complete: {
    icon: Check,
    title: "Ready!",
    description: "Your summary is complete",
    color: "from-emerald-500 to-green-500",
  },
}

const PHASE_ORDER: DemoPhase[] = ["url", "chapters", "summary", "complete"]
const PHASE_DURATION = 2000 // Duration each phase is shown
const PAUSE_DURATION = 1500 // Pause at complete before restart

export function HeroDemoAnimation({ className }: { className?: string }) {
  const [currentPhase, setCurrentPhase] = useState<DemoPhase>("url")

  useEffect(() => {
    let currentIndex = 0
    const timer = setInterval(() => {
      currentIndex = (currentIndex + 1) % PHASE_ORDER.length
      setCurrentPhase(PHASE_ORDER[currentIndex])
    }, currentPhase === "complete" ? PAUSE_DURATION : PHASE_DURATION)

    return () => clearInterval(timer)
  }, [currentPhase])

  return (
    <div className={cn("relative", className)}>
      {/* Demo Card */}
      <div className="card-elevated p-6 overflow-hidden">
        {/* Skeleton URL Input */}
        <div className="mb-6">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Play className="w-5 h-5 text-red-500" />
            <motion.div
              className="flex-1 h-5 rounded-md bg-slate-200 overflow-hidden"
              animate={currentPhase === "url" ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
              transition={{ duration: 1.5, repeat: currentPhase === "url" ? Infinity : 0 }}
            >
              <AnimatePresence mode="wait">
                {currentPhase !== "url" && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    exit={{ width: 0 }}
                    className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-md"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Skeleton Chapters */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Chapters</span>
          </div>

          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg"
              initial={{ opacity: 0.3 }}
              animate={{
                opacity: (currentPhase === "chapters" || currentPhase === "summary" || currentPhase === "complete") ? 1 : 0.3,
                x: (currentPhase === "chapters" || currentPhase === "summary" || currentPhase === "complete") ? 0 : -10,
              }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  (currentPhase === "chapters" || currentPhase === "summary" || currentPhase === "complete")
                    ? ["bg-indigo-500", "bg-teal-500", "bg-violet-500"][index]
                    : "bg-slate-300"
                )}
              />
              <div
                className={cn(
                  "h-3 rounded transition-colors",
                  (currentPhase === "chapters" || currentPhase === "summary" || currentPhase === "complete")
                    ? "bg-slate-300"
                    : "bg-slate-200"
                )}
                style={{ width: `${60 + index * 15}%` }}
              />
            </motion.div>
          ))}
        </div>

        {/* Skeleton Summary */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Summary</span>
          </div>

          <AnimatePresence mode="wait">
            {(currentPhase === "summary" || currentPhase === "complete") ? (
              <motion.div
                key="summary-content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {[100, 95, 80, 90, 60].map((width, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="h-2.5 rounded bg-slate-200"
                    style={{ width: `${width}%` }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="summary-placeholder"
                className="h-16 rounded-lg bg-slate-100 border border-dashed border-slate-200 flex items-center justify-center"
              >
                <span className="text-xs text-slate-400">Summary will appear here</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            {PHASE_ORDER.map((phase, index) => {
              const config = PHASES[phase]
              const Icon = config.icon
              const isActive = phase === currentPhase
              const isPast = PHASE_ORDER.indexOf(currentPhase) > index

              return (
                <motion.div
                  key={phase}
                  className="flex-1"
                  animate={{ scale: isActive ? 1.05 : 1 }}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors",
                      isActive && "bg-slate-50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        isActive && `bg-gradient-to-br ${config.color} shadow-sm`,
                        isPast && "bg-emerald-100",
                        !isActive && !isPast && "bg-slate-100"
                      )}
                    >
                      {isPast ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            isActive ? "text-white" : "text-slate-400"
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium text-center leading-tight",
                        isActive ? "text-slate-700" : "text-slate-400"
                      )}
                    >
                      {config.title}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-full blur-2xl pointer-events-none" />
    </div>
  )
}

/**
 * Simplified version for mobile
 */
export function HeroDemoAnimationCompact({ className }: { className?: string }) {
  const [currentPhase, setCurrentPhase] = useState<DemoPhase>("url")

  useEffect(() => {
    const phases: DemoPhase[] = ["url", "chapters", "summary", "complete"]
    let index = 0

    const timer = setInterval(() => {
      index = (index + 1) % phases.length
      setCurrentPhase(phases[index])
    }, 2000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      {PHASE_ORDER.map((phase, index) => {
        const phaseConfig = PHASES[phase]
        const PhaseIcon = phaseConfig.icon
        const isActive = phase === currentPhase
        const isPast = PHASE_ORDER.indexOf(currentPhase) > index

        return (
          <motion.div
            key={phase}
            animate={{
              scale: isActive ? 1.2 : 1,
              opacity: isActive ? 1 : isPast ? 0.8 : 0.4,
            }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isActive && `bg-gradient-to-br ${phaseConfig.color}`,
              isPast && "bg-emerald-100",
              !isActive && !isPast && "bg-slate-200"
            )}
          >
            {isPast ? (
              <Check className="w-5 h-5 text-emerald-600" />
            ) : (
              <PhaseIcon
                className={cn(
                  "w-5 h-5",
                  isActive ? "text-white" : "text-slate-400"
                )}
              />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
