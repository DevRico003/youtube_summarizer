# Installation Guide

This guide covers how to install and run YouTube Summarizer V2 using Docker or docker-compose.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose V2 (optional, for docker-compose setup)
- At least 1GB of available disk space

## Quick Start with Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd youtube-summarizer
   ```

2. Create your environment file:
   ```bash
   cp .env.example .env
   ```

3. Generate a secure APP_SECRET:
   ```bash
   # Linux/macOS
   openssl rand -base64 32

   # Or use the setup wizard after starting the app
   ```

4. Edit `.env` and set your APP_SECRET:
   ```env
   APP_SECRET=your-generated-secret-here
   ```

5. Start the application:
   ```bash
   docker-compose up -d
   ```

6. Access the application at http://localhost:3000

7. Complete the setup wizard to configure your API keys.

## Docker Compose Configuration

The `docker-compose.yml` provides:

- **Automatic database persistence**: SQLite data stored in a Docker volume
- **Health checks**: Automatic container restart on failure
- **Production optimizations**: NODE_ENV=production, standalone Next.js build

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_SECRET` | Yes | Encryption key for API keys (min 16 characters) |
| `DATABASE_URL` | No | Database path (defaults to `/app/data/dev.db` in Docker) |

### Volumes

The `youtube-summarizer-data` volume persists:
- SQLite database (`dev.db`)
- All user data, summaries, and preferences

To backup your data:
```bash
docker cp youtube-summarizer:/app/data ./backup
```

## Manual Docker Build

If you prefer to build and run manually:

1. Build the Docker image:
   ```bash
   docker build -t youtube-summarizer .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name youtube-summarizer \
     -p 3000:3000 \
     -e APP_SECRET="your-secure-secret" \
     -e DATABASE_URL="file:/app/data/dev.db" \
     -v youtube-summarizer-data:/app/data \
     youtube-summarizer
   ```

## Updating

To update to a new version:

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

Your data will be preserved in the Docker volume.

## Stopping the Application

```bash
# Stop the container (preserves data)
docker-compose down

# Stop and remove all data (DESTRUCTIVE)
docker-compose down -v
```

## Troubleshooting

### Container won't start

Check the logs:
```bash
docker-compose logs -f
```

### Database migration errors

The entrypoint script runs migrations automatically. If you encounter issues:
```bash
docker-compose exec app npx prisma migrate deploy
```

### Health check failing

The app needs about 30-40 seconds to start. Check if it's ready:
```bash
curl http://localhost:3000/api/health
```

### Port already in use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Use port 3001 instead
```

## Next Steps

- [Configure API Keys](./configuration.md)
- [API Reference](./api.md)
- [Local Development](./development.md)
