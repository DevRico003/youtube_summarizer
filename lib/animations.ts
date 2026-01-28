import type { Variants, Transition } from "framer-motion"

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export const pageTransition: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
}

// Container with staggered children
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// Individual item animation
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
}

// Fade in animation
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

// Fade up animation
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

// Scale in animation
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

// Slide from left
export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

// Slide from right
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
}

// Card hover animation
export const cardHover = {
  scale: 1.02,
  y: -4,
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
  },
}

// Button hover animation
export const buttonHover = {
  scale: 1.02,
  y: -2,
  transition: {
    type: "spring" as const,
    stiffness: 400,
    damping: 25,
  },
}

// Glow pulse animation for buttons
export const glowPulse: Variants = {
  initial: { boxShadow: "0 0 0 rgba(99, 102, 241, 0)" },
  animate: {
    boxShadow: [
      "0 0 20px rgba(99, 102, 241, 0.3)",
      "0 0 40px rgba(99, 102, 241, 0.2)",
      "0 0 20px rgba(99, 102, 241, 0.3)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

// Sidebar animation
export const sidebarVariants: Variants = {
  collapsed: {
    width: 64,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  expanded: {
    width: 200,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
}

// Progress stage animation
export const progressStageVariants: Variants = {
  pending: {
    opacity: 0.5,
    scale: 0.98,
  },
  active: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
  complete: {
    opacity: 1,
    scale: 1,
  },
}

// Orb pulse animation
export const orbPulse: Variants = {
  initial: { scale: 1, opacity: 0.6 },
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

// Ring rotation
export const ringRotate = {
  animate: {
    rotate: 360,
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "linear",
    },
  },
}

// Typing animation for loading text
export const typingContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
}

export const typingCharacter: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 12,
      stiffness: 200,
    },
  },
}

// Smooth spring transition presets
export const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
}

export const smoothSpring = {
  type: "spring" as const,
  stiffness: 200,
  damping: 20,
}

export const quickSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
}
