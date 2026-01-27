# Configuration Guide

This guide covers how to configure YouTube Summarizer V2, including API keys and user preferences.

## Setup Wizard

On first run, the application will redirect you to the setup wizard at `/setup`. This wizard guides you through:

1. **App Secret**: Generate or set a secure encryption key
2. **Supadata API Key**: For fetching YouTube transcripts
3. **Z.AI API Key**: For GLM-4.7 (primary LLM model)
4. **Fallback Models**: Gemini, Groq, and OpenAI API keys

All API keys are optional - you can skip any step and add keys later via Settings.

## API Keys

### Supadata (Transcript Fetching)

Supadata is used for fetching YouTube video transcripts with timestamps.

1. Visit [Supadata](https://supadata.ai)
2. Create an account and subscribe to a plan
3. Generate an API key from your dashboard
4. Add it via Setup Wizard or Settings > API Keys

**Features:**
- Native transcript fetching (1 credit per video)
- AI-generated transcripts for videos without captions
- Timestamp support for topic detection

### Z.AI / GLM-4.7 (Primary LLM)

Z.AI provides access to the GLM-4.7 model, which supports "thinking mode" for enhanced reasoning.

1. Visit [Z.AI](https://z.ai)
2. Create an account
3. Navigate to API settings
4. Generate an API key

**Features:**
- High-quality summarization
- Thinking mode for complex analysis
- Primary model in the fallback chain

### Gemini (Fallback)

Google's Gemini is a fast and efficient model.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a project if needed
3. Generate an API key

**Features:**
- Free tier available
- Fast processing
- Good for quick summaries

### Groq (Fallback)

Groq provides fast inference for open-source models.

1. Visit [Groq Cloud](https://console.groq.com/)
2. Sign up for an account
3. Generate an API key

**Features:**
- Very fast inference
- Llama 3.1 model support
- Free tier available

### OpenAI (Fallback)

OpenAI's GPT-4o-mini provides reliable summarization.

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or log in
3. Generate an API key

**Features:**
- Consistent quality
- Reliable availability
- Pay-per-use pricing

## Model Fallback Chain

When generating summaries, the application tries models in this order:

1. **GLM-4.7** (Z.AI) - Primary model
2. **Gemini** (Google) - First fallback
3. **Groq** (Llama 3.1) - Second fallback
4. **GPT-4o-mini** (OpenAI) - Final fallback

If a model fails or its API key isn't configured, the next model is tried automatically.

## User Preferences

Logged-in users can configure preferences in Settings > Preferences:

### Language

Select the default language for summaries:
- English
- German

### Detail Level

Choose the default summary detail level:
1. **Brief**: Quick overview, key points only
2. **Concise**: Short summary with main ideas
3. **Balanced**: Moderate detail (default)
4. **Detailed**: Comprehensive coverage
5. **Comprehensive**: Full analysis with examples

### Preferred Model

Select your default AI model for summarization.

### Thinking Mode

Enable "thinking mode" for GLM-4.7 to use enhanced reasoning for complex videos.

## Custom Prompt Templates

Create custom prompts in Settings > Prompt Templates:

### Available Variables

- `{{transcript}}` - The video transcript
- `{{language}}` - User's selected language
- `{{detailLevel}}` - Selected detail level (1-5)

### Example Template

```
Summarize the following transcript in {{language}}.
Provide a {{detailLevel}} level of detail.

Focus on:
- Key concepts and definitions
- Main arguments and evidence
- Practical takeaways

Transcript:
{{transcript}}
```

## Environment Variables

For advanced configuration, set these in your `.env` file:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_SECRET` | Yes | - | Encryption key for API keys |
| `DATABASE_URL` | No | `file:./dev.db` | SQLite database path |

API keys can be set as environment variables instead of using the UI:

| Variable | Description |
|----------|-------------|
| `SUPADATA_API_KEY` | Supadata API key |
| `ZAI_API_KEY` | Z.AI API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GROQ_API_KEY` | Groq API key |
| `OPENAI_API_KEY` | OpenAI API key |

**Note:** API keys set via the UI are stored encrypted in the database and take precedence over environment variables.

## Security Notes

- API keys are encrypted using AES-256-GCM before storage
- The `APP_SECRET` is used as the encryption key
- Never commit your `.env` file to version control
- Use strong, unique APP_SECRET values in production
- API keys in the Settings UI show only the last 4 characters

## Next Steps

- [API Reference](./api.md)
- [Local Development](./development.md)
- [Installation Guide](./installation.md)
