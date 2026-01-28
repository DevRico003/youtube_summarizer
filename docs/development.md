# Development Guide

This guide covers how to set up a local development environment for YouTube Summarizer V2.

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

## Quick Start

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd youtube-summarizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Generate a secure APP_SECRET (or use the setup wizard):
   ```bash
   openssl rand -base64 32
   ```

5. Edit `.env`:
   ```env
   APP_SECRET=your-generated-secret
   DATABASE_URL="file:./dev.db"
   ```

6. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open http://localhost:3000 and complete the setup wizard.

## Project Structure

```
youtube-summarizer/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── health/        # Health check endpoint
│   │   ├── preferences/   # User preferences
│   │   ├── summarize/     # Summary generation
│   │   ├── templates/     # Prompt templates
│   │   ├── topics/        # Topic editing
│   │   └── usage/         # Usage statistics
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── settings/          # Settings page
│   ├── setup/             # Setup wizard
│   ├── summary/           # Summary view page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── ChapterLinks.tsx  # Chapter link list
│   ├── DetailSlider.tsx  # Detail level slider
│   ├── ModelSelector.tsx # AI model selector
│   ├── ProgressStages.tsx # Progress indicator
│   ├── Timeline.tsx      # Visual timeline
│   └── TopicEditor.tsx   # Topic editor
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication state
├── lib/                  # Utility libraries
│   ├── appConfig.ts      # Encrypted config storage
│   ├── auth.ts           # Authentication utilities
│   ├── chunking.ts       # Smart transcript chunking
│   ├── encryption.ts     # AES-256-GCM encryption
│   ├── exportMarkdown.ts # Markdown export
│   ├── glm.ts            # GLM-4.7 client
│   ├── llmChain.ts       # LLM fallback chain
│   ├── prisma.ts         # Prisma client instance
│   ├── supadata.ts       # Supadata client
│   ├── topicExtraction.ts # Topic detection
│   ├── transcript.ts     # Transcript fetching
│   ├── usageLogger.ts    # API usage logging
│   └── youtube.ts        # YouTube URL utilities
├── prisma/               # Database schema and migrations
│   ├── migrations/       # Migration history
│   └── schema.prisma     # Prisma schema
├── docs/                 # Documentation
├── Dockerfile            # Docker build
├── docker-compose.yml    # Docker Compose config
└── package.json          # Dependencies
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Database Management

### View the database
```bash
npx prisma studio
```

### Create a migration
```bash
npx prisma migrate dev --name your-migration-name
```

### Reset the database
```bash
rm prisma/dev.db
npx prisma db push
```

### Update Prisma client
```bash
npx prisma generate
```

## Type Checking

Run TypeScript type checking:
```bash
npx tsc --noEmit
```

## Code Style

The project uses:
- ESLint 9 with TypeScript support
- Tailwind CSS for styling
- shadcn/ui components

Run linting:
```bash
npm run lint
```

## Key Patterns

### Authentication

Protected API endpoints use JWT tokens:

```typescript
import { verifyToken } from "@/lib/auth";

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  return payload?.userId ?? null;
}
```

### API Key Storage

API keys are encrypted using AES-256-GCM:

```typescript
import { getConfig, setConfig } from "@/lib/appConfig";

// Get a key
const apiKey = await getConfig("SUPADATA_API_KEY");

// Set a key
await setConfig("SUPADATA_API_KEY", "your-key");
```

### LLM Fallback Chain

Use the fallback chain for resilient LLM calls:

```typescript
import { callWithFallback } from "@/lib/llmChain";

const result = await callWithFallback(prompt, {
  temperature: 0.7,
  maxTokens: 2000,
  preferredModel: "glm-4.7"
});

console.log(result.response, result.modelUsed);
```

### Streaming Responses

The summarize endpoint uses streaming for progress updates:

```typescript
const stream = new TransformStream();
const writer = stream.writable.getWriter();

await writer.write(encoder.encode(JSON.stringify(event) + "\n"));

return new Response(stream.readable, {
  headers: { "Content-Type": "text/event-stream" }
});
```

## Testing API Endpoints

### Using curl

```bash
# Health check
curl http://localhost:3000/api/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get preferences (with token)
curl http://localhost:3000/api/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_SECRET` | Yes | Encryption key for API keys (min 16 chars) |
| `DATABASE_URL` | No | SQLite path (default: `file:./dev.db`) |

Optional API keys (can be set via UI instead):
- `SUPADATA_API_KEY`
- `ZAI_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`

## Troubleshooting

### "Cannot find module @prisma/client"
```bash
npx prisma generate
```

### "Database locked" errors
Stop any other processes using the database:
```bash
lsof prisma/dev.db
```

### TypeScript errors after schema change
```bash
npx prisma generate
npx tsc --noEmit
```

### Module resolution issues
```bash
rm -rf node_modules .next
npm install
npm run dev
```

## Next Steps

- [Installation Guide](./installation.md)
- [Configuration Guide](./configuration.md)
- [API Reference](./api.md)
