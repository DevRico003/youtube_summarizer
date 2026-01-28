"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Brain, Check, ChevronDown, AlertCircle } from "lucide-react"
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

const MODEL_COLORS: Record<string, { gradient: string; text: string }> = {
  "glm-4.7": {
    gradient: "from-violet-500 to-purple-500",
    text: "text-violet-600",
  },
}

interface ModelDropdownProps {
  value: string
  onChange: (model: string) => void
  className?: string
}

export function ModelDropdown({
  value,
  onChange,
  className,
}: ModelDropdownProps) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchModelAvailability() {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch("/api/summarize", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [])

  const selectedModel = models.find((m) => m.id === value)
  const Icon = selectedModel ? (MODEL_ICONS[selectedModel.id] || Bot) : Bot
  const colors = selectedModel ? (MODEL_COLORS[selectedModel.id] || { gradient: "from-slate-400 to-slate-500", text: "text-slate-600" }) : { gradient: "from-slate-400 to-slate-500", text: "text-slate-600" }

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
      <div className={cn("space-y-3", className)}>
        <div className="h-11 rounded-lg bg-slate-200 animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Model Dropdown */}
      <div ref={dropdownRef} className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
            "bg-white border border-slate-200 shadow-sm",
            "hover:border-slate-300 hover:bg-slate-50 transition-all",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2",
            isOpen && "border-indigo-300 ring-2 ring-indigo-100"
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label="Select AI model"
        >
          {/* Model Icon */}
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              "bg-gradient-to-br shadow-sm",
              colors.gradient
            )}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>

          {/* Model Info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">
                {selectedModel?.name || "Select Model"}
              </span>
              {selectedModel && !selectedModel.available && (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
            {selectedModel && (
              <span className="text-xs text-slate-400 line-clamp-1">
                {MODEL_DESCRIPTIONS[selectedModel.id]?.slice(0, 40)}...
              </span>
            )}
          </div>

          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute z-50 top-full left-0 right-0 mt-1.5",
                "p-1.5 max-h-[400px] overflow-y-auto",
                "bg-white rounded-xl border border-slate-200 shadow-lg",
                "origin-top"
              )}
              role="listbox"
            >
              {(Object.entries(groupedModels) as [ProviderGroup, ModelInfo[]][]).map(([group, groupModels]) => {
                if (groupModels.length === 0) return null

                return (
                  <div key={group}>
                    {/* Group Header */}
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {GROUP_LABELS[group]}
                    </div>

                    {/* Group Models */}
                    {groupModels.map((model) => {
                      const ModelIcon = MODEL_ICONS[model.id] || Bot
                      const modelColors = MODEL_COLORS[model.id] || { gradient: "from-slate-400 to-slate-500", text: "text-slate-600" }
                      const isSelected = model.id === value
                      const description = MODEL_DESCRIPTIONS[model.id] || "AI language model"

                      return (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            if (model.available) {
                              onChange(model.id)
                              setIsOpen(false)
                            }
                          }}
                          disabled={!model.available}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg",
                            "text-left transition-all",
                            model.available
                              ? "cursor-pointer hover:bg-slate-50"
                              : "cursor-not-allowed opacity-50",
                            isSelected && "bg-indigo-50"
                          )}
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={!model.available}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                              "bg-gradient-to-br shadow-sm",
                              modelColors.gradient
                            )}
                          >
                            <ModelIcon className="w-4 h-4 text-white" />
                          </div>

                          {/* Model Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-indigo-700" : "text-slate-800"
                              )}>
                                {model.name}
                              </span>
                              {!model.available && (
                                <span className="text-xs text-red-500">Not configured</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {description}
                            </p>
                          </div>

                          {/* Check mark */}
                          {isSelected && (
                            <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
