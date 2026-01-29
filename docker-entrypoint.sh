#!/bin/sh
set -e

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."

  # If RESET_DATABASE is set, force reset the database
  if [ "$RESET_DATABASE" = "true" ]; then
    echo "RESET_DATABASE is set, resetting database..."
    prisma db push --force-reset --accept-data-loss
  elif ! prisma migrate deploy 2>/dev/null; then
    echo "Migration deploy failed, trying db push..."
    prisma db push --accept-data-loss || {
      echo "ERROR: Migration failed. If you need to reset the database, run with RESET_DATABASE=true"
      exit 1
    }
  fi

  echo "Database migrations completed."

  # Seed security questions if they don't exist
  # Extract database path from DATABASE_URL (format: file:/path/to/db)
  DB_PATH=$(echo "$DATABASE_URL" | sed 's|file:||')
  if [ -f "$DB_PATH" ] && [ -f "/app/prisma/seed.sql" ]; then
    echo "Seeding security questions..."
    sqlite3 "$DB_PATH" < /app/prisma/seed.sql
    echo "Security questions seeded."
  fi
fi

# Start the application
exec node server.js
