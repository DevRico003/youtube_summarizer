#!/bin/bash

# Start cron service
service cron start

    echo "Cookie initialization successful, starting Streamlit..."
    streamlit run app.py