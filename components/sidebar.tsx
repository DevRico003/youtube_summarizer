"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Home,
  History,
  Menu,
  Settings,
  LogIn,
  LogOut,
  User,
} from "lucide-react"
import type React from "react"
import { useAuth } from "@/hooks/useAuth"

const routes = [
  {
    label: "Home",
    icon: Home,
    href: "/",
  },
  {
    label: "History",
    icon: History,
    href: "/history",
  },
]

type SidebarProps = React.HTMLAttributes<HTMLDivElement>

export function Sidebar({ className }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <TooltipProvider delayDuration={100}>
      <motion.aside
        className={cn(
          "fixed left-0 top-0 h-screen z-50",
          "flex flex-col",
          "bg-white/80 backdrop-blur-xl",
          "border-r border-slate-200/60",
          className
        )}
        initial={false}
        animate={{
          width: isExpanded ? 200 : 64,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-slate-200/60">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="YT Summarizer Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-display font-semibold text-slate-900 whitespace-nowrap overflow-hidden"
                >
                  YT Summary
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="space-y-1 px-2">
            {routes.map((route) => {
              const isActive = pathname === route.href
              return (
                <NavItem
                  key={route.href}
                  icon={route.icon}
                  label={route.label}
                  href={route.href}
                  isActive={isActive}
                  isExpanded={isExpanded}
                />
              )
            })}
            {isAuthenticated && (
              <NavItem
                icon={Settings}
                label="Settings"
                href="/settings"
                isActive={pathname === "/settings"}
                isExpanded={isExpanded}
              />
            )}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200/60 p-2">
          {isLoading ? (
            <div className="h-10 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-1">
              {/* User info */}
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg",
                  "text-slate-500"
                )}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs truncate max-w-[120px]"
                    >
                      {user?.email}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Logout button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg",
                      "text-slate-500 hover:text-slate-700 hover:bg-slate-100",
                      "transition-colors duration-200"
                    )}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-sm whitespace-nowrap"
                        >
                          Logout
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right">Logout</TooltipContent>
                )}
              </Tooltip>
            </div>
          ) : (
            <NavItem
              icon={LogIn}
              label="Login"
              href="/login"
              isActive={pathname === "/login"}
              isExpanded={isExpanded}
            />
          )}
        </div>
      </motion.aside>

      {/* Spacer to push content - hidden on mobile */}
      <div className="w-16 flex-shrink-0 hidden md:block" />
    </TooltipProvider>
  )
}

interface NavItemProps {
  icon: typeof Home
  label: string
  href: string
  isActive: boolean
  isExpanded: boolean
}

function NavItem({ icon: Icon, label, href, isActive, isExpanded }: NavItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "transition-all duration-200 relative",
            isActive
              ? "bg-indigo-50 text-indigo-600"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          {isActive && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute left-0 w-0.5 h-6 bg-indigo-500 rounded-r"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </Link>
      </TooltipTrigger>
      {!isExpanded && <TooltipContent side="right">{label}</TooltipContent>}
    </Tooltip>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await logout()
  }

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    // Close if swiped left more than 100px
    if (info.offset.x < -100) {
      setOpen(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden hover:bg-slate-100/50 focus-visible:bg-slate-100/50"
        >
          <Menu className="h-6 w-6 text-slate-500" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 bg-white border-r border-slate-200/60"
      >
        <motion.div
          className="h-full flex flex-col"
          drag="x"
          dragConstraints={{ left: -100, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200/60">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="YT Summarizer Logo"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display font-semibold text-slate-900">
              YT Summary
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3">
          <div className="space-y-1">
            {routes.map((route) => {
              const isActive = pathname === route.href
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl min-h-[48px]",
                    "transition-colors duration-200",
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <route.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{route.label}</span>
                </Link>
              )
            })}
            {isAuthenticated && (
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl min-h-[48px]",
                  "transition-colors duration-200",
                  pathname === "/settings"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </Link>
            )}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-slate-200/60 p-3">
          {isLoading ? (
            <div className="h-12 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-4 py-3 text-slate-500">
                <User className="w-4 h-4" />
                <span className="text-sm truncate">{user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl min-h-[48px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl min-h-[48px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-sm font-medium">Login</span>
            </Link>
          )}
        </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  )
}
