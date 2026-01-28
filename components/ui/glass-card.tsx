"use client"

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { cardHover } from "@/lib/animations"

interface GlassCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "elevated" | "glow"
  hoverEffect?: boolean
  children: React.ReactNode
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", hoverEffect = false, children, ...props }, ref) => {
    const variants = {
      default: "card-soft",
      elevated: "card-elevated",
      glow: "card-soft glow-primary",
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          variants[variant],
          className
        )}
        whileHover={hoverEffect ? cardHover : undefined}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
GlassCard.displayName = "GlassCard"

type GlassCardHeaderProps = React.HTMLAttributes<HTMLDivElement>

const GlassCardHeader = React.forwardRef<HTMLDivElement, GlassCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    />
  )
)
GlassCardHeader.displayName = "GlassCardHeader"

type GlassCardTitleProps = React.HTMLAttributes<HTMLHeadingElement>

const GlassCardTitle = React.forwardRef<HTMLHeadingElement, GlassCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-xl font-semibold leading-none tracking-tight text-slate-900",
        className
      )}
      {...props}
    />
  )
)
GlassCardTitle.displayName = "GlassCardTitle"

type GlassCardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

const GlassCardDescription = React.forwardRef<HTMLParagraphElement, GlassCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
  )
)
GlassCardDescription.displayName = "GlassCardDescription"

type GlassCardContentProps = React.HTMLAttributes<HTMLDivElement>

const GlassCardContent = React.forwardRef<HTMLDivElement, GlassCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
)
GlassCardContent.displayName = "GlassCardContent"

type GlassCardFooterProps = React.HTMLAttributes<HTMLDivElement>

const GlassCardFooter = React.forwardRef<HTMLDivElement, GlassCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4", className)}
      {...props}
    />
  )
)
GlassCardFooter.displayName = "GlassCardFooter"

export {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
}
