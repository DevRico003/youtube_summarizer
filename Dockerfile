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

# Copy prisma schema and package files first (for better caching)
COPY prisma ./prisma/
COPY package*.json ./

# Install dependencies
RUN npm ci

# generate client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Create volume for SQLite database
COPY prisma/schema.prisma /app/prisma/schema.prisma
VOLUME ["/app/prisma"]

# Start the application with direct command
CMD ["/bin/sh", "-c", "npx prisma db push --schema=/app/prisma/schema.prisma && npm start"]