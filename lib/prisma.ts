import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL environment variable is required in production');
    }
    return 'file:./dev.db';
  }
  return url;
}

// Note: Prisma 7 with better-sqlite3 adapter stores DateTime as ISO 8601 strings.
// Fresh installations work correctly. If upgrading from Prisma 6 with existing data,
// delete the old database file or migrate DateTime columns from Unix timestamps to ISO 8601.
const adapter = new PrismaBetterSqlite3({
  url: getDatabaseUrl()
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
