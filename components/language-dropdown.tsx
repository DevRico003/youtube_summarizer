"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, ChevronDown, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

export type OutputLanguage = "de" | "en" | "fr" | "es" | "it"

interface LanguageOption {
  code: OutputLanguage
  name: string
  flag: string
  nativeName: string
}

const LANGUAGES: LanguageOption[] = [
  { code: "de", name: "German", flag: "🇩🇪", nativeName: "Deutsch" },
  { code: "en", name: "English", flag: "🇬🇧", nativeName: "English" },
  { code: "fr", name: "French", flag: "🇫🇷", nativeName: "Français" },
  { code: "es", name: "Spanish", flag: "🇪🇸", nativeName: "Español" },
  { code: "it", name: "Italian", flag: "🇮🇹", nativeName: "Italiano" },
]

interface LanguageDropdownProps {
  value: OutputLanguage
  onChange: (language: OutputLanguage) => void
  className?: string
}

export function LanguageDropdown({
  value,
  onChange,
  className,
}: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedLanguage = LANGUAGES.find((l) => l.code === value) || LANGUAGES[1]

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

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-white border border-slate-200 shadow-sm",
          "hover:border-slate-300 hover:bg-slate-50 transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2",
          isOpen && "border-indigo-300 ring-2 ring-indigo-100"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select output language"
      >
        <span className="text-lg leading-none" role="img" aria-label={selectedLanguage.name}>
          {selectedLanguage.flag}
        </span>
        <span className="text-sm font-medium text-slate-700 hidden sm:inline">
          {selectedLanguage.nativeName}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform",
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
              "absolute z-50 top-full left-0 mt-1.5",
              "min-w-[160px] p-1.5",
              "bg-white rounded-xl border border-slate-200 shadow-lg",
              "origin-top"
            )}
            role="listbox"
          >
            {LANGUAGES.map((language) => {
              const isSelected = language.code === value

              return (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => {
                    onChange(language.code)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg",
                    "text-left transition-colors",
                    isSelected
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="text-lg leading-none" role="img" aria-label={language.name}>
                    {language.flag}
                  </span>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{language.nativeName}</span>
                    <span className="text-xs text-slate-400 ml-1.5">({language.name})</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Get the default language based on browser settings
 */
export function getDefaultLanguage(): OutputLanguage {
  if (typeof navigator === "undefined") return "en"

  const browserLang = navigator.language.toLowerCase().slice(0, 2)
  const supportedLang = LANGUAGES.find((l) => l.code === browserLang)

  return supportedLang?.code || "en"
}

/**
 * Compact language selector for inline use
 */
interface LanguageSelectorCompactProps {
  value: OutputLanguage
  onChange: (language: OutputLanguage) => void
  className?: string
}

export function LanguageSelectorCompact({
  value,
  onChange,
  className,
}: LanguageSelectorCompactProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Globe className="w-4 h-4 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OutputLanguage)}
        className={cn(
          "text-sm font-medium text-slate-700 bg-transparent",
          "border-none outline-none cursor-pointer",
          "focus:ring-0"
        )}
        aria-label="Select output language"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.flag} {language.nativeName}
          </option>
        ))}
      </select>
    </div>
  )
}
