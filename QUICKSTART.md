# CCPLATE - Quick Start Guide

**Get your SaaS up and running in under 5 minutes!** ⚡

---

## 🚀 One-Click Deploy (Recommended)

**Using Docker (easiest):**

```bash
# 1. Clone the repo
git clone https://github.com/RaapTechllc/CCPLATE.git
cd CCPLATE

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Start everything (app + database + redis)
npm run docker:up

# 4. Run migrations
npm run db:migrate

# 5. Seed demo data (optional)
npm run seed

# 6. Open http://localhost:3000
```

**Done!** Your SaaS is running with authentication, admin panel, and AI builders!

---

## 💻 Local Development (Manual)

**Prerequisites:**
- Node.js 20+
- PostgreSQL 16+
- Redis (optional, for caching)

```bash
# 1. Install dependencies
npm install

# 2. Set up database
createdb ccplate
# Or use Docker: docker run -d -p 5432:5432 -e POSTGRES_DB=ccplate postgres:16

# 3. Configure environment
cp .env.example .env.local
# Add your DATABASE_URL and API keys

# 4. Run migrations
npm run db:migrate

# 5. Seed demo data
npm run seed

# 6. Start dev server
npm run dev

# 7. Open http://localhost:3000
```

---

## 🎬 Demo Mode

**For judges/investors:**

```bash
# Reset to fresh demo state
npm run reset

# This will:
# - Clear all data
# - Seed demo users and content
# - Set up example AI builders
```

**Demo Credentials:**
- Admin: `admin@ccplate.dev` / `Demo123!@#`
- User: `user@ccplate.dev` / `Demo123!@#`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- guardian

# Watch mode
npm test -- --watch
```

---

## 🛠️ Docker Commands

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down

# Rebuild and start
npm run docker:build

# View logs
docker-compose logs -f app

# Access database
docker exec -it ccplate-db psql -U postgres -d ccplate
```

---

## 🏗️ AI Builders

CCPLATE includes 6 AI-powered builders to accelerate development:

### 1. Hook Builder
Generate React hooks from natural language descriptions.

```bash
npm run build:hook "useAuth hook for user authentication"
```

### 2. Component Builder
Create React components with props and styling.

```bash
npm run build:component "ProfileCard component showing user info"
```

### 3. API Builder
Scaffold CRUD endpoints from Prisma models.

```bash
npm run build:api User
```

### 4. Schema Builder
Generate Prisma models from descriptions.

```bash
npm run build:schema "Blog with posts, comments, and tags"
```

### 5. Prompt Builder
Design, test, and version AI prompts.

```bash
npm run build:prompt
```

### 6. Agent Builder
Create AI agents with custom tools.

```bash
npm run build:agent
```

---

## 📊 Admin Panel

Access the admin panel at: `http://localhost:3000/admin`

**Features:**
- User management
- System settings
- Usage analytics
- File management
- Logs viewer

**Default admin credentials:**
- Email: `admin@ccplate.dev`
- Password: `Demo123!@#`

---

## 🐛 Troubleshooting

**Port already in use:**
```bash
# Change port in docker-compose.yml or:
export PORT=3001
npm run dev
```

**Database connection failed:**
```bash
# Check DATABASE_URL in .env.local
# Ensure PostgreSQL is running
docker-compose ps
```

**Prisma errors:**
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database
npx prisma migrate reset
```

**Build errors:**
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

---

## 📚 Documentation

- **Architecture:** See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **API Reference:** See [docs/API.md](./docs/API.md)
- **Builders Guide:** See [docs/BUILDERS.md](./docs/BUILDERS.md)
- **Deployment:** See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## 🎯 Quick Demo Flow

**5-minute walkthrough:**

1. **Login** (admin@ccplate.dev)
2. **Admin Panel** - Manage users, view stats
3. **Hook Builder** - Generate a custom React hook
4. **Component Builder** - Create a UI component
5. **Schema Builder** - Design database models
6. **API Builder** - Generate CRUD endpoints

**Key selling points:**
- ✅ 50% of SaaS built out-of-the-box
- ✅ AI builders save 10x development time
- ✅ Production-ready authentication
- ✅ Admin panel included
- ✅ Full test coverage

---

**Questions?** Check [README.md](./README.md) or open an issue!
