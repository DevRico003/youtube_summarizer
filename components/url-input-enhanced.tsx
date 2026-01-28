"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link2, AlertCircle, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UrlInputEnhancedProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  isLoading?: boolean
  isValid?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function UrlInputEnhanced({
  value,
  onChange,
  onBlur,
  error,
  isLoading,
  isValid,
  disabled,
  placeholder = "Paste YouTube URL...",
  className,
}: UrlInputEnhancedProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.replace(/^@/, "")
    onChange(newValue)
  }

  return (
    <div className={cn("relative", className)}>
      {/* Input container with soft shadow */}
      <motion.div
        className={cn(
          "relative rounded-xl overflow-hidden transition-all duration-300 bg-white border",
          isFocused && !error && "border-indigo-300 shadow-lg shadow-indigo-100",
          error && "border-red-300 ring-2 ring-red-100",
          !isFocused && !error && "border-slate-200 shadow-sm hover:border-slate-300"
        )}
        animate={{
          scale: isFocused ? 1.005 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Input field */}
        <div className="relative flex items-center">
          {/* Icon */}
          <div className="absolute left-4 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                </motion.div>
              ) : isValid ? (
                <motion.div
                  key="valid"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Check className="h-5 w-5 text-emerald-500" />
                </motion.div>
              ) : (
                <motion.div
                  key="link"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Link2
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isFocused ? "text-indigo-500" : "text-slate-400"
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            type="url"
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              onBlur?.()
            }}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "w-full h-14 pl-12 pr-4 bg-transparent",
              "text-slate-800 placeholder:text-slate-400",
              "focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "font-mono text-sm"
            )}
            aria-invalid={!!error}
            aria-describedby={error ? "url-error" : undefined}
          />
        </div>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <p
              id="url-error"
              className="flex items-center gap-2 mt-2 text-sm text-red-500"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
