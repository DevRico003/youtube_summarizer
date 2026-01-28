import { prisma } from './prisma';

/**
 * Logs an API usage record to the database.
 *
 * @param userId - The ID of the user making the request, or null for unauthenticated requests
 * @param service - The API service being used (e.g., 'supadata', 'zai', 'gemini', 'groq', 'openai')
 * @param endpoint - The specific endpoint or operation being called
 * @param creditsUsed - The number of credits consumed by this API call
 * @param tokensUsed - The number of tokens consumed by this API call
 */
export async function logApiUsage(
  userId: string | null,
  service: string,
  endpoint: string,
  creditsUsed: number = 0,
  tokensUsed: number = 0
): Promise<void> {
  try {
    await prisma.apiUsageLog.create({
      data: {
        userId,
        service,
        endpoint,
        creditsUsed,
        tokensUsed,
      },
    });
  } catch (error) {
    // Log the error but don't throw - usage logging should not break the main flow
    console.error('Failed to log API usage:', error);
  }
}

/**
 * Get usage statistics for a user within a date range.
 *
 * @param userId - The user ID to get stats for
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 */
export async function getUserUsageStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
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
    if (endDate) where.timestamp.lte = endDate;
  }

  const logs = await prisma.apiUsageLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
  });

  // Aggregate by service
  const byService = logs.reduce((acc, log) => {
    if (!acc[log.service]) {
      acc[log.service] = {
        totalRequests: 0,
        totalCredits: 0,
        totalTokens: 0,
      };
    }
    acc[log.service].totalRequests++;
    acc[log.service].totalCredits += log.creditsUsed;
    acc[log.service].totalTokens += log.tokensUsed;
    return acc;
  }, {} as Record<string, { totalRequests: number; totalCredits: number; totalTokens: number }>);

  return {
    logs,
    byService,
    totalRequests: logs.length,
    totalCredits: logs.reduce((sum, log) => sum + log.creditsUsed, 0),
    totalTokens: logs.reduce((sum, log) => sum + log.tokensUsed, 0),
  };
}
