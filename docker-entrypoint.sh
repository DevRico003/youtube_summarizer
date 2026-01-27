#!/bin/sh
set -e

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx prisma migrate deploy 2>/dev/null || npx prisma db push --accept-data-loss
  echo "Database migrations completed."
fi

# Start the application
exec node server.js
