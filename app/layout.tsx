import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar, MobileSidebar } from "@/components/sidebar"
import type React from "react" // Added import for React

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "YouTube AI Summarizer",
  description: "Summarize YouTube videos with AI",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <aside className="hidden w-64 overflow-y-auto border-r bg-background md:block">
            <Sidebar />
          </aside>
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-14 items-center border-b px-4 lg:px-6">
              <MobileSidebar />
              <h1 className="text-lg font-semibold">YouTube AI Summarizer</h1>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}

