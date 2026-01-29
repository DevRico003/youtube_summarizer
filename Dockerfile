# syntax=docker/dockerfile:1

# ====================================
# Stage 1: Dependencies
# ====================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules (bcrypt)
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files and prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (--legacy-peer-deps for zod version conflict)
RUN npm ci --legacy-peer-deps

# ====================================
# Stage 2: Builder
# ====================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
# Provide a dummy DATABASE_URL for build time - the real URL is set at runtime
ENV DATABASE_URL="file:./build-placeholder.db"
# Provide a dummy BETTER_AUTH_SECRET for build time - the real secret is set at runtime
ENV BETTER_AUTH_SECRET="build-time-placeholder-not-used-in-production"
RUN npm run build

# ====================================
# Stage 3: Production
# ====================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install sqlite for database operations and npm for prisma CLI
RUN apk add --no-cache libc6-compat sqlite

# Install Prisma CLI globally for database migrations
RUN npm install -g prisma@7.3.0

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for database operations
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Create data directory for SQLite database persistence
RUN mkdir -p /app/data

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port 3000
EXPOSE 3000

# Set host to listen on all interfaces
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Start the application
CMD ["./docker-entrypoint.sh"]
