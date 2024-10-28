#!/bin/bash

# Start Xvfb for headless Chrome
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Wait for Xvfb to start
sleep 2

echo "Starting initial cookie update..."
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    python3 /app/update_cookies.py > /app/logs/initial_cookie_update.log 2>&1
    
    if [ -f /app/data/cookies.txt ]; then
        echo "Initial cookie update completed successfully"
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        echo "Attempt $RETRY_COUNT failed. Retrying in 5 seconds..."
        sleep 5
    fi
done

echo "Failed to create initial cookies after $MAX_RETRIES attempts"
exit 1 