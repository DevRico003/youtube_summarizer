#!/bin/bash

# Start Xvfb for headless Chrome
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Wait for Xvfb to start
sleep 2

echo "Starting initial cookie update..."

# Führe update_cookies.py aus und zeige die Ausgabe live an
unbuffer python3 /app/update_cookies.py 2>&1 | tee -a /app/logs/initial_cookie_update.log | while IFS= read -r line; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
done

# Wenn das Script hier ankommt, war es erfolgreich
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Initial cookie update completed"
exit 0 