import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function extractTitleFromContent(content: string): string {
  try {
    const lines = content.split('\n');
    // Look for title in different formats
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('🎯 TITLE:') ||
          trimmedLine.startsWith('🎯 TITEL:') ||
          trimmedLine.startsWith('🎙️ TITLE:') ||
          trimmedLine.startsWith('🎙️ TITEL:')) {
        const title = trimmedLine.split(':')[1].trim();
        if (title) return title;
      }
    }
    // Fallback: Use first non-empty line if no title marker found
    const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
    if (firstNonEmptyLine) {
      return firstNonEmptyLine.trim().replace(/^[🎯🎙️]\s*/, '');
    }
  } catch (error) {
    console.error('Error extracting title:', error);
  }
  return 'Untitled Summary';
}

export async function GET() {
  try {
    const summaries = await prisma.summary.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    const processedSummaries = summaries.map(summary => ({
      ...summary,
      title: extractTitleFromContent(summary.content)
    }));

    return NextResponse.json({ summaries: processedSummaries });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    );
  }
}