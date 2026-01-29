import type { Metadata } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar, MobileSidebar } from "@/components/sidebar"
import { Providers } from "@/components/providers"
import type React from "react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "YouTube Summarizer",
  description: "AI-powered YouTube video summarization",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}
      >
        <Providers>
          <div className="flex min-h-screen">
            {/* Minimal Sidebar - Hidden on mobile, visible on md+ */}
            <Sidebar className="hidden md:flex" />
            {/* Mobile Sidebar - centralized here for all pages */}
            <MobileSidebar />

            {/* Main Content Area */}
            <main className="flex-1 min-h-screen gradient-mesh overflow-y-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
