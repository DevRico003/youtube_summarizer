FROM python:3.9-slim

# Install system dependencies and Chrome
RUN apt-get update && apt-get install -y \
    cron \
    unzip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    default-jdk \
    wget \
    curl \
    expect-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get update \
    && apt-get install -y ./google-chrome-stable_current_amd64.deb \
    && rm google-chrome-stable_current_amd64.deb

# Set up Chrome and Selenium cache directories
RUN mkdir -p /root/.cache/selenium \
    && chmod -R 777 /root/.cache/selenium

# Create and set working directory
WORKDIR /app

# Create directory for persistent cookies and logs
RUN mkdir -p /app/data \
    && mkdir -p /app/logs

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set up cron job for cookie updates
RUN echo "*/45 * * * * /usr/local/bin/python3 /app/update_cookies.py >> /app/logs/cookie_update.log 2>&1" > /etc/cron.d/cookie-cron \
    && chmod 0644 /etc/cron.d/cookie-cron \
    && crontab /etc/cron.d/cookie-cron

# Set environment variables
ENV PYTHONUNBUFFERED=1 
ENV COOKIE_PATH=/app/data/cookies.txt
ENV DISPLAY=:99

# Copy and make scripts executable
COPY init_cookies.sh /app/
COPY entrypoint.sh /app/
RUN chmod +x /app/init_cookies.sh \
    && chmod +x /app/entrypoint.sh \
    && chmod +x /app/update_cookies.py

# Expose Streamlit port
EXPOSE 8501

# Run init_cookies first, then entrypoint
ENTRYPOINT ["/bin/bash", "-c", "/app/init_cookies.sh && ./entrypoint.sh"]
