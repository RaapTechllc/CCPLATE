# Vercel Deployment

Deploy your CCPLATE application to Vercel with claimable deployments for easy team handoff.

## Prerequisites

### Required

| Item | Description |
|------|-------------|
| **VERCEL_API_TOKEN** | API token from Vercel dashboard |
| **Vercel CLI** | Install with `npm i -g vercel` |

### Optional

| Item | Description |
|------|-------------|
| **VERCEL_TEAM_ID** | Team ID for team deployments (uses personal account if not set) |
| **vercel.json** | Deployment configuration (uses defaults if not present) |

## Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Get API Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it (e.g., "CCPLATE Deployments")
4. Set scope and expiration
5. Copy the token

### 3. Configure Environment

Add to your `.env.local`:

```env
VERCEL_API_TOKEN=your_token_here
VERCEL_TEAM_ID=team_xxxxx  # Optional: for team deployments
```

### 4. Validate Setup

```bash
ccplate deploy validate
```

You should see:

```
Vercel Credential Validation
────────────────────────────────────────
✅ Vercel CLI: 33.x.x
✅ VERCEL_API_TOKEN: Set
✅ VERCEL_TEAM_ID: team_xxxxx
✅ Ready to deploy
```

## CLI Commands

### Deploy

```bash
# Preview deployment (default)
ccplate deploy

# Production deployment
ccplate deploy --prod

# With custom project name
ccplate deploy --name my-project

# Force deployment (skip build cache)
ccplate deploy --force
```

### Check Status

```bash
# Check specific deployment
ccplate deploy status <deployment-id>
```

### List Deployments

```bash
# List recent deployments
ccplate deploy list

# Limit results
ccplate deploy list --limit 5
```

### Validate Credentials

```bash
ccplate deploy validate
```

## Deployment Workflow

### Standard Deployment

1. **Validate**: Ensure credentials are set
   ```bash
   ccplate deploy validate
   ```

2. **Preview Deploy**: Test changes first
   ```bash
   ccplate deploy
   ```

3. **Verify**: Check the preview URL

4. **Production Deploy**: Ship it
   ```bash
   ccplate deploy --prod
   ```

### CI/CD Integration

For automated deployments, set environment variables in your CI:

```yaml
# GitHub Actions example
env:
  VERCEL_API_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
  VERCEL_TEAM_ID: ${{ secrets.VERCEL_TEAM_ID }}

steps:
  - name: Deploy to Vercel
    run: ccplate deploy --prod
```

## Deployment Log

All deployments are logged to `memory/deployments.jsonl` for audit purposes:

```json
{
  "id": "deploy-1706000000000",
  "deploymentId": "dpl_xxxxx",
  "environment": "production",
  "url": "https://my-app-xxxx.vercel.app",
  "createdAt": "2024-01-23T12:00:00.000Z",
  "createdBy": "developer",
  "status": "success"
}
```

## Troubleshooting

### "VERCEL_API_TOKEN not set"

**Solution**: Add the token to your environment:

```bash
export VERCEL_API_TOKEN=your_token_here
```

Or add to `.env.local` and ensure it's loaded.

### "Vercel CLI not installed"

**Solution**: Install globally:

```bash
npm install -g vercel
```

### "Deployment failed"

Check the logs output for specific errors. Common issues:

- **Build errors**: Fix TypeScript/lint errors first
- **Missing dependencies**: Ensure `package.json` is up to date
- **Environment variables**: Some may need to be set in Vercel dashboard

### "Team not found"

If using `VERCEL_TEAM_ID`:

1. Verify the team ID is correct (find in Vercel dashboard URL)
2. Ensure your token has access to the team
3. Remove `VERCEL_TEAM_ID` to use personal account

## Security Notes

- **Never commit** `VERCEL_API_TOKEN` to version control
- Use environment variables or secrets management
- Tokens have full account access - rotate regularly
- Consider scoped tokens for CI/CD

## Related

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel API Reference](https://vercel.com/docs/rest-api)
- [Environment Variables in Vercel](https://vercel.com/docs/environment-variables)
