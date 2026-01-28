"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Brain, Info, Check, AlertCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ModelInfo {
  id: string
  name: string
  available: boolean
  group?: string
}

type ProviderGroup = "zai"

const GROUP_LABELS: Record<ProviderGroup, string> = {
  zai: "Z.AI",
}

const MODEL_DESCRIPTIONS: Record<string, string> = {
  "glm-4.7": "Z.AI's powerful model for high-quality summaries",
}

const MODEL_ICONS: Record<string, typeof Bot> = {
  "glm-4.7": Brain,
}

const MODEL_COLORS: Record<string, { gradient: string; shadow: string }> = {
  "glm-4.7": {
    gradient: "from-violet-500 to-purple-500",
    shadow: "shadow-violet-200",
  },
}

interface ModelSelectorCardsProps {
  value: string
  onChange: (model: string) => void
  className?: string
}

export function ModelSelectorCards({
  value,
  onChange,
  className,
}: ModelSelectorCardsProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchModelAvailability() {
      try {
        const response = await fetch("/api/summarize")
        const data = await response.json()
        setModels(data.models || [])

        if (data.models?.length > 0) {
          const currentModel = data.models.find(
            (m: ModelInfo) => m.id === value
          )
          if (!value || !currentModel?.available) {
            const firstAvailable = data.models.find(
              (m: ModelInfo) => m.available
            )
            if (firstAvailable) {
              onChange(firstAvailable.id)
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch model availability:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchModelAvailability()
  }, [])

  // Group models by provider group
  const groupedModels = useMemo(() => {
    const groups: Record<ProviderGroup, ModelInfo[]> = {
      zai: [],
    }

    for (const model of models) {
      const group = (model.group as ProviderGroup) || "zai"
      if (groups[group]) {
        groups[group].push(model)
      }
    }

    return groups
  }, [models])

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <label className="text-sm font-medium text-slate-700">AI Model</label>
        <div className="grid grid-cols-1 gap-3">
          <div className="h-24 rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            AI Model
          </label>
        </div>

        {/* Model cards by group */}
        <div className="space-y-4">
          {(Object.entries(groupedModels) as [ProviderGroup, ModelInfo[]][]).map(([group, groupModels]) => {
            if (groupModels.length === 0) return null

            return (
              <div key={group}>
                {/* Group Header */}
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {GROUP_LABELS[group]}
                </div>

                {/* Group Models Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {groupModels.map((model) => {
                    const Icon = MODEL_ICONS[model.id] || Bot
                    const colors = MODEL_COLORS[model.id] || {
                      gradient: "from-slate-400 to-slate-500",
                      shadow: "shadow-slate-200",
                    }
                    const isSelected = value === model.id
                    const description =
                      MODEL_DESCRIPTIONS[model.id] || "AI language model"

                    return (
                      <motion.button
                        key={model.id}
                        type="button"
                        onClick={() => model.available && onChange(model.id)}
                        disabled={!model.available}
                        className={cn(
                          "group relative flex flex-col items-start p-3.5 rounded-xl text-left transition-all",
                          "border bg-white",
                          model.available
                            ? "cursor-pointer hover:border-indigo-300 hover:shadow-md"
                            : "cursor-not-allowed opacity-50",
                          isSelected
                            ? "border-indigo-400 bg-indigo-50/50 shadow-md"
                            : "border-slate-200",
                          colors.shadow
                        )}
                        whileHover={model.available ? { scale: 1.02, y: -1 } : {}}
                        whileTap={model.available ? { scale: 0.98 } : {}}
                      >
                        {/* Selection indicator */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute top-2 right-2"
                            >
                              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Icon with gradient background */}
                        <div
                          className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center mb-2 shadow-sm",
                            "bg-gradient-to-br",
                            colors.gradient
                          )}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>

                        {/* Model name */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm text-slate-800">
                            {model.name}
                          </span>
                          {!model.available && (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>

                        {/* Availability status */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              model.available ? "bg-emerald-500" : "bg-red-400"
                            )}
                          />
                          <span className="text-xs text-slate-400">
                            {model.available ? "Available" : "Not configured"}
                          </span>
                        </div>

                        {/* Tooltip for description */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="absolute bottom-2 right-2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">{description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
