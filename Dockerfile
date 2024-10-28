FROM python:3.9-slim

# Install system dependencies including FFmpeg and its dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libglib2.0-0 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Upgrade pip and install yt-dlp separately to ensure latest version
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir yt-dlp --upgrade

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Create directory for temporary files
RUN mkdir -p /tmp/youtube_audio && \
    chmod 777 /tmp/youtube_audio

# Set working directory for temporary files
ENV TMPDIR=/tmp/youtube_audio

# Expose Streamlit port
EXPOSE 8501

# Run the application
CMD ["streamlit", "run", "app.py", "--server.address", "0.0.0.0"]
