# YouTube Summarizer V2

A modern Next.js application for AI-powered YouTube video summarization with interactive timelines, topic editing, and multi-model support.

## Features

- **Multiple AI Models** with automatic fallback:
  - GLM-4.7 (Z.AI) - Primary model with thinking mode
  - Gemini (Google) - Fast and efficient
  - Groq (Llama 3.1) - Very fast inference
  - GPT-4o-mini (OpenAI) - Reliable fallback

- **Smart Transcript Processing**:
  - Native YouTube transcripts via Supadata
  - AI-generated transcripts for videos without captions
  - Timestamp-aware topic detection

- **Interactive Timeline**:
  - Visual topic segments
  - Click to jump to YouTube timestamps
  - Editable topic boundaries and titles

- **User Accounts**:
  - Personal preferences and settings
  - Custom prompt templates
  - Usage tracking and statistics

- **Export Options**:
  - Markdown export with chapter links
  - Copyable YouTube timestamp links

## Quick Start

### Docker (Recommended)

```bash
# Clone the repository
git clone [repository-url]
cd youtube-summarizer

# Create environment file
cp .env.example .env

# Generate APP_SECRET and add to .env
openssl rand -base64 32

# Start the application
docker-compose up -d

# Open http://localhost:3000 and complete setup wizard
```

### Local Development

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Start dev server
npm run dev
```

## Documentation

- [Installation Guide](./docs/installation.md) - Docker and docker-compose setup
- [Configuration Guide](./docs/configuration.md) - API keys and user settings
- [API Reference](./docs/api.md) - REST API endpoints
- [Development Guide](./docs/development.md) - Local development setup

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Prisma with SQLite
- **AI Models**: GLM-4.7, Gemini, Groq, OpenAI
- **Transcripts**: Supadata SDK
- **Auth**: JWT with bcrypt

## Configuration

The application uses a setup wizard for initial configuration. You can also configure via environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_SECRET` | Yes | Encryption key for API keys |
| `DATABASE_URL` | No | Database path (default: `file:./dev.db`) |

API keys can be configured via the setup wizard or Settings page.

## API Keys

Get API keys from:

- **Supadata**: [supadata.ai](https://supadata.ai) - Transcript fetching
- **Z.AI**: [z.ai](https://z.ai) - GLM-4.7 model
- **Google AI Studio**: [aistudio.google.com](https://aistudio.google.com/app/apikey) - Gemini
- **Groq**: [console.groq.com](https://console.groq.com) - Fast inference
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys) - GPT models

Only one LLM API key is required. The app will use available models with automatic fallback.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
