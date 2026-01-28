"use client"

import { motion } from "framer-motion"
import { Zap, FileText, BookOpen, Library, ScrollText } from "lucide-react"
import { cn } from "@/lib/utils"

const DETAIL_LEVELS = [
  {
    value: 1,
    label: "Brief",
    description: "Quick overview, key points only",
    icon: Zap,
  },
  {
    value: 2,
    label: "Concise",
    description: "Main ideas with some detail",
    icon: FileText,
  },
  {
    value: 3,
    label: "Balanced",
    description: "Good balance of brevity and depth",
    icon: BookOpen,
  },
  {
    value: 4,
    label: "Detailed",
    description: "Thorough coverage of topics",
    icon: Library,
  },
  {
    value: 5,
    label: "Comprehensive",
    description: "In-depth analysis with all details",
    icon: ScrollText,
  },
]

interface DetailSliderVisualProps {
  value: number
  onChange: (value: number) => void
  className?: string
}

export function DetailSliderVisual({
  value,
  onChange,
  className,
}: DetailSliderVisualProps) {
  const currentLevel =
    DETAIL_LEVELS.find((level) => level.value === value) || DETAIL_LEVELS[2]
  const CurrentIcon = currentLevel.icon

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
          Detail Level
        </label>
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <CurrentIcon className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-600">
            {currentLevel.label}
          </span>
        </motion.div>
      </div>

      {/* Visual slider track */}
      <div className="relative">
        {/* Background track */}
        <div className="h-2 rounded-full bg-slate-200">
          {/* Filled track */}
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
            initial={false}
            animate={{
              width: `${((value - 1) / 4) * 100}%`,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          />
        </div>

        {/* Interactive dots */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between">
          {DETAIL_LEVELS.map((level) => {
            const isActive = value >= level.value
            const isCurrent = value === level.value
            const Icon = level.icon

            return (
              <motion.button
                key={level.value}
                type="button"
                onClick={() => onChange(level.value)}
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 -mt-3 rounded-full",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Dot background */}
                <motion.div
                  className={cn(
                    "absolute w-4 h-4 rounded-full transition-colors",
                    isActive
                      ? "bg-indigo-500"
                      : "bg-white border border-slate-300"
                  )}
                  animate={{
                    scale: isCurrent ? 1.5 : 1,
                    boxShadow: isCurrent
                      ? "0 0 15px rgba(99, 102, 241, 0.4)"
                      : "none",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />

                {/* Icon (visible on current) */}
                <AnimatedIcon
                  icon={Icon}
                  isVisible={isCurrent}
                  className="relative z-10"
                />
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Description */}
      <motion.p
        key={value}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-slate-500 text-center"
      >
        {currentLevel.description}
      </motion.p>

      {/* Level labels (optional, shown on larger screens) */}
      <div className="hidden sm:flex justify-between text-xs text-slate-400">
        {DETAIL_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "w-16 text-center transition-colors hover:text-slate-600",
              value === level.value && "text-indigo-600 font-medium"
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AnimatedIcon({
  icon: Icon,
  isVisible,
  className,
}: {
  icon: typeof Zap
  isVisible: boolean
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      <Icon className="h-3 w-3 text-white" />
    </motion.div>
  )
}
