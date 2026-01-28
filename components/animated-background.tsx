"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AnimatedBackgroundProps {
  className?: string
  intensity?: "low" | "medium" | "high"
}

export function AnimatedBackground({
  className,
  intensity = "medium",
}: AnimatedBackgroundProps) {
  const intensityConfig = {
    low: { opacity: 0.3, blur: "blur-3xl" },
    medium: { opacity: 0.5, blur: "blur-2xl" },
    high: { opacity: 0.7, blur: "blur-xl" },
  }

  const config = intensityConfig[intensity]

  return (
    <div className={cn("fixed inset-0 -z-10 overflow-hidden", className)}>
      {/* Soft gradient orbs for light theme */}
      {/* Primary gradient orb - top left */}
      <motion.div
        className={cn(
          "absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-indigo-300",
          config.blur
        )}
        style={{ opacity: config.opacity * 0.4 }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary gradient orb - bottom right */}
      <motion.div
        className={cn(
          "absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-teal-300",
          config.blur
        )}
        style={{ opacity: config.opacity * 0.3 }}
        animate={{
          x: [0, -40, 0],
          y: [0, -50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Pink accent orb */}
      <motion.div
        className={cn(
          "absolute top-1/3 right-1/4 w-1/4 h-1/4 rounded-full bg-pink-300",
          config.blur
        )}
        style={{ opacity: config.opacity * 0.3 }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [config.opacity * 0.2, config.opacity * 0.3, config.opacity * 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Soft noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

// Loading orb animation for AI processing
export function LoadingOrb({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-24 h-24", className)}>
      {/* Center orb */}
      <motion.div
        className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500 to-teal-400 shadow-lg shadow-indigo-200"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner glow */}
      <motion.div
        className="absolute inset-2 rounded-full bg-indigo-400/20 blur-md"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2,
        }}
      />

      {/* Outer ring 1 */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-indigo-300/50"
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Outer ring 2 */}
      <motion.div
        className="absolute -inset-2 rounded-full border border-teal-300/40"
        animate={{ rotate: -360 }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  )
}
