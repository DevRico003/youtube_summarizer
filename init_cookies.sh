#!/bin/bash

# Start Xvfb for headless Chrome
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Wait for Xvfb to start
sleep 2

echo "Starting initial cookie update..."
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Führe update_cookies.py aus und zeige die Ausgabe live an
    echo "Attempt $((RETRY_COUNT+1)) of $MAX_RETRIES"
    
    # Verwende unbuffer für echte Live-Ausgabe
    unbuffer python3 /app/update_cookies.py 2>&1 | tee -a /app/logs/initial_cookie_update.log | while IFS= read -r line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
        
        # Prüfe auf erfolgreichen Abschluss
        if [[ "$line" == *"Browser wird geschlossen..."* ]]; then
            if [ -f /app/data/cookies.txt ] && [ -s /app/data/cookies.txt ]; then
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] Initial cookie update completed successfully"
                exit 0
            fi
        fi
    done
    
    # Wenn der Loop beendet wurde ohne exit 0, war der Versuch nicht erfolgreich
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Attempt $RETRY_COUNT failed. Retrying in 5 seconds..."
        sleep 5
    fi
done

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Failed to create initial cookies after $MAX_RETRIES attempts"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Last log contents:"
cat /app/logs/initial_cookie_update.log | while IFS= read -r line; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
done
exit 1 