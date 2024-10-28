#!/bin/bash

# Start cron service
service cron start

# Run initial cookie setup
/app/init_cookies.sh

# Check if init_cookies.sh was successful
if [ $? -eq 0 ]; then
    echo "Cookie initialization successful, starting Streamlit..."
    streamlit run app.py --server.address 0.0.0.0
else
    echo "Cookie initialization failed. Check logs at /app/logs/initial_cookie_update.log"
    exit 1
fi
