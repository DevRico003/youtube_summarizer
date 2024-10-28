#!/bin/bash

# Start cron service
service cron start

# Start Xvfb for headless Chrome
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Initial cookie update with waiting
echo "Starting initial cookie update..."
python3 /app/update_cookies.py > /app/logs/initial_cookie_update.log 2>&1

# Check if cookie update was successful
if [ -f /app/data/cookies.txt ]; then
    echo "Initial cookie update completed successfully"
    # Start Streamlit
    streamlit run app.py
else
    echo "Initial cookie update failed. Check logs at /app/logs/initial_cookie_update.log"
    exit 1
fi
