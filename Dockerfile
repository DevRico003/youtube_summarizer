# Use Node.js LTS (Long Term Support) version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Create volume for SQLite database
VOLUME ["/app/prisma"]

# Start the application with direct command
CMD ["/bin/sh", "-c", "npx prisma db push && npm start"]
