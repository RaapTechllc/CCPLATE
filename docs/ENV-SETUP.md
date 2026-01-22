# Environment Setup Guide

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Generate a secure NextAuth secret:
   ```bash
   openssl rand -base64 32
   ```

3. Configure the required variables below.

## Required Variables

### Database
```
DATABASE_URL="postgresql://user:password@localhost:5432/ccplate"
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=ccplate
```

To start a local PostgreSQL with Docker:
```bash
docker-compose up -d
```

### Authentication
```
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<your-generated-secret>"
```

## Optional: AI Providers

For AI-powered builders to work, configure at least one:

### OpenAI
```
AI_PROVIDER=openai
OPENAI_API_KEY="sk-..."
AI_DEFAULT_MODEL=gpt-4
```
Get key from: https://platform.openai.com/api-keys

### Anthropic
```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY="sk-ant-..."
AI_DEFAULT_MODEL=claude-3-sonnet-20240229
```
Get key from: https://console.anthropic.com/

## Optional: Email (Resend)

```
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
```
Get key from: https://resend.com/api-keys

## Optional: OAuth Providers

### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 credentials
3. Add authorized redirect: http://localhost:3000/api/auth/callback/google
```
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Set callback URL: http://localhost:3000/api/auth/callback/github
```
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

## Optional: Storage

```
STORAGE_TYPE=LOCAL
```

Options: `LOCAL` (default) or configure cloud storage as needed.

## Testing Your Setup

```bash
# Start the dev server
npm run dev

# In another terminal, run tests
npm run test
```

## Troubleshooting

### Database connection failed
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL format matches your setup
- Verify credentials match docker-compose.yml

### AI generation returns errors
- Verify API key is correct and has no extra whitespace
- Check you have credits/quota on your provider
- Ensure AI_PROVIDER matches the key you configured

### NextAuth errors
- Ensure NEXTAUTH_SECRET is set (generate with `openssl rand -base64 32`)
- Verify NEXTAUTH_URL matches your dev server URL

### OAuth callback errors
- Check redirect URIs match exactly in provider console
- Ensure client ID and secret are correct
