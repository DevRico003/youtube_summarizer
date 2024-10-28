#!/bin/bash

# Start cookie update cron job in background
(crontab -l 2>/dev/null; echo "*/10 * * * * /usr/bin/python3 /app/update_cookies.py >> /app/data/cookie_update.log 2>&1") | crontab -
service cron start

# Start the Streamlit app
streamlit run app.py --server.address 0.0.0.0
