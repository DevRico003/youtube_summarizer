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
fi

# Start the application
exec node server.js
