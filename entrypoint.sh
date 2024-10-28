#!/bin/bash

# Start cron service
service cron start

# Start Xvfb for headless Chrome
Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Initial cookie update
python3 /app/update_cookies.py

# Start Streamlit
streamlit run app.py --server.address 0.0.0.0
