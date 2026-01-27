import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * Extract and verify JWT token from Authorization header
 */
function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}

/**
 * Parse date string from query params
 */
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get start of day, week, or month for a date
 */
function getStartOf(date: Date, period: "day" | "week" | "month"): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = result.getDay();
    result.setDate(result.getDate() - day);
  } else if (period === "month") {
    result.setDate(1);
  }

  return result;
}

/**
 * Format date as YYYY-MM-DD for grouping
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format date as YYYY-WW (year-week) for grouping
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

/**
 * Format date as YYYY-MM for monthly grouping
 */
function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

interface UsageBreakdown {
  period: string;
  requests: number;
  credits: number;
  tokens: number;
}

interface ServiceUsage {
  service: string;
  totalRequests: number;
  totalCredits: number;
  totalTokens: number;
}

interface UsageLog {
  id: string;
  service: string;
  endpoint: string;
  creditsUsed: number;
  tokensUsed: number;
  timestamp: Date;
}

/**
 * GET /api/usage
 * Returns aggregated usage statistics for the authenticated user
 *
 * Query params:
 * - startDate: ISO date string for start of range
 * - endDate: ISO date string for end of range
 */
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));

    // Build where clause
    const where: {
      userId: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
      };
    } = { userId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.timestamp.lte = endOfDay;
      }
    }

    // Fetch usage logs
    const logs = await prisma.apiUsageLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        service: true,
        endpoint: true,
        creditsUsed: true,
        tokensUsed: true,
        timestamp: true,
      },
    });

    // Aggregate by service
    const serviceMap = new Map<
      string,
      { requests: number; credits: number; tokens: number }
    >();

    for (const log of logs) {
      const existing = serviceMap.get(log.service) || {
        requests: 0,
        credits: 0,
        tokens: 0,
      };
      existing.requests++;
      existing.credits += log.creditsUsed;
      existing.tokens += log.tokensUsed;
      serviceMap.set(log.service, existing);
    }

    const byService: ServiceUsage[] = Array.from(serviceMap.entries()).map(
      ([service, stats]) => ({
        service,
        totalRequests: stats.requests,
        totalCredits: stats.credits,
        totalTokens: stats.tokens,
      })
    );

    // Daily breakdown (group by YYYY-MM-DD)
    const dailyMap = new Map<
      string,
      { requests: number; credits: number; tokens: number }
    >();
    for (const log of logs) {
      const key = formatDate(log.timestamp);
      const existing = dailyMap.get(key) || {
        requests: 0,
        credits: 0,
        tokens: 0,
      };
      existing.requests++;
      existing.credits += log.creditsUsed;
      existing.tokens += log.tokensUsed;
      dailyMap.set(key, existing);
    }

    const daily: UsageBreakdown[] = Array.from(dailyMap.entries())
      .map(([period, stats]) => ({
        period,
        requests: stats.requests,
        credits: stats.credits,
        tokens: stats.tokens,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Weekly breakdown (group by YYYY-WXX)
    const weeklyMap = new Map<
      string,
      { requests: number; credits: number; tokens: number }
    >();
    for (const log of logs) {
      const key = getWeekKey(log.timestamp);
      const existing = weeklyMap.get(key) || {
        requests: 0,
        credits: 0,
        tokens: 0,
      };
      existing.requests++;
      existing.credits += log.creditsUsed;
      existing.tokens += log.tokensUsed;
      weeklyMap.set(key, existing);
    }

    const weekly: UsageBreakdown[] = Array.from(weeklyMap.entries())
      .map(([period, stats]) => ({
        period,
        requests: stats.requests,
        credits: stats.credits,
        tokens: stats.tokens,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Monthly breakdown (group by YYYY-MM)
    const monthlyMap = new Map<
      string,
      { requests: number; credits: number; tokens: number }
    >();
    for (const log of logs) {
      const key = getMonthKey(log.timestamp);
      const existing = monthlyMap.get(key) || {
        requests: 0,
        credits: 0,
        tokens: 0,
      };
      existing.requests++;
      existing.credits += log.creditsUsed;
      existing.tokens += log.tokensUsed;
      monthlyMap.set(key, existing);
    }

    const monthly: UsageBreakdown[] = Array.from(monthlyMap.entries())
      .map(([period, stats]) => ({
        period,
        requests: stats.requests,
        credits: stats.credits,
        tokens: stats.tokens,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate totals
    const totalRequests = logs.length;
    const totalCredits = logs.reduce((sum, log) => sum + log.creditsUsed, 0);
    const totalTokens = logs.reduce((sum, log) => sum + log.tokensUsed, 0);

    // Format logs for response (limit to last 100 for performance)
    const recentLogs: UsageLog[] = logs.slice(0, 100).map((log) => ({
      id: log.id,
      service: log.service,
      endpoint: log.endpoint,
      creditsUsed: log.creditsUsed,
      tokensUsed: log.tokensUsed,
      timestamp: log.timestamp,
    }));

    return NextResponse.json({
      success: true,
      usage: {
        totalRequests,
        totalCredits,
        totalTokens,
        byService,
        daily,
        weekly,
        monthly,
        logs: recentLogs,
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
