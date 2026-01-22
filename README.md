# CCPLATE

A SaaS boilerplate with AI-powered developer tooling. Get 50% of the way on any project instantly, then use built-in builders to accelerate feature development.

## Features

### Out-of-the-Box
- 🔐 **Authentication** - Email/password + OAuth (Google, GitHub)
- 👤 **User Management** - Profile, settings, role-based access
- 🛡️ **Admin Panel** - User management, system settings, stats
- 📁 **File Storage** - Upload, manage, serve files
- 🎨 **UI Components** - Button, Card, Input, and more

### AI-Powered Builders
- **Hook Builder** - Generate React hooks from descriptions
- **Prompt Builder** - Design, test, and version AI prompts
- **Agent Builder** - Create AI agents with custom tools
- **Schema Builder** - Generate Prisma models from descriptions
- **API Builder** - Scaffold CRUD endpoints from models
- **Component Builder** - Generate React components

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI or Anthropic API key (for AI features)

### Installation

1. Clone and install:
```bash
git clone <repo-url>
cd ccplate
npm install
```

2. Set up environment:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```
See [docs/ENV-SETUP.md](docs/ENV-SETUP.md) for detailed configuration instructions.

3. Set up database:
```bash
npm run db:push
```

4. Run development server:
```bash
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXTAUTH_URL | Yes | Your app URL (http://localhost:3000 for dev) |
| NEXTAUTH_SECRET | Yes | Random secret for NextAuth |
| OPENAI_API_KEY | For AI | OpenAI API key |
| ANTHROPIC_API_KEY | For AI | Anthropic API key (alternative to OpenAI) |
| AI_PROVIDER | No | `openai` or `anthropic` (default: openai) |
| RESEND_API_KEY | For email | Resend API key for emails |
| EMAIL_FROM | For email | From address for emails |
| GOOGLE_CLIENT_ID | Optional | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Optional | Google OAuth secret |
| GITHUB_CLIENT_ID | Optional | GitHub OAuth client ID |
| GITHUB_CLIENT_SECRET | Optional | GitHub OAuth secret |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register, etc.)
│   ├── (protected)/       # Protected pages (dashboard, builders)
│   ├── admin/             # Admin panel
│   └── api/               # API routes
├── components/
│   ├── ui/                # Reusable UI components
│   ├── features/          # Feature-specific components
│   └── layout/            # Layout components
├── lib/
│   ├── ai/                # AI provider abstraction
│   ├── hook-builder/      # Hook generation
│   ├── prompt-builder/    # Prompt management
│   ├── agent-builder/     # Agent creation
│   ├── schema-builder/    # Prisma schema generation
│   ├── api-builder/       # API route generation
│   └── component-builder/ # Component generation
└── generated/             # Prisma client
```

## Using the Builders

### Hook Builder
1. Navigate to `/hook-builder`
2. Describe the hook you need (e.g., "Fetch paginated users with search")
3. Click Generate
4. Copy or download the generated code

### Prompt Builder
1. Navigate to `/prompt-builder`
2. Create a new prompt with system/user templates
3. Define variables using `{{variableName}}` syntax
4. Test with different variable values
5. Save versions for iteration

### Agent Builder
1. Navigate to `/agent-builder`
2. Create an agent with a system prompt
3. Enable built-in tools or add custom ones
4. Test in the chat interface

### Schema Builder
1. Navigate to `/schema-builder`
2. Describe your data model
3. Preview the generated Prisma schema
4. Apply to add to your schema.prisma

### API Builder
1. Navigate to `/api-builder`
2. Select a Prisma model or describe an API
3. Configure auth and pagination options
4. Preview and apply generated routes

### Component Builder
1. Navigate to `/component-builder`
2. Describe the component you need
3. Select features (loading state, pagination, etc.)
4. Preview and download the code

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Prisma Studio |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **AI**: OpenAI / Anthropic
- **Email**: Resend

## License

MIT
