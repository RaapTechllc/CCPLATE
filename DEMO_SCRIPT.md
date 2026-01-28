# CCPLATE - Demo Script

**For Judges, Investors, & Presentations**

---

## 🎯 The Problem (30 seconds)

"Building a SaaS takes 6-12 months. Every founder builds the same features: auth, admin panel, file uploads."

**Pain points:**
- 90% of early dev time is boilerplate
- Can't test product-market fit quickly
- AI tools help but lack context
- Generic templates don't include AI features

---

## 💡 The Solution (30 seconds)

"CCPLATE gets you **50% of the way instantly**, then AI builders accelerate the other 50%."

**Think of it as:**
- Rails for the AI era
- SaaS starter with AI superpowers
- 6 months of work → 2 weeks

---

## 🎬 Live Demo (2.5 minutes)

### 1. The Base Platform (20 sec)
**Login:** admin@ccplate.dev / Demo123!@#

**What to show:**
- Authentication (email + OAuth)
- Admin panel (users, settings, analytics)
- File storage working
- Professional UI (Radix components)

**Say:** "This is what you get out of the box. Would take 2 months to build."

---

### 2. Hook Builder - AI-Generated React Hooks (30 sec)
**Navigate:** Dashboard → Hook Builder

**What to do:**
- Type: "useLocalStorage hook that syncs with localStorage"
- Click "Generate"
- AI writes the hook in 3 seconds
- Show generated code
- Click "Add to Project"

**Say:** "Hook Builder generates production-ready React hooks. What took 30 minutes now takes 30 seconds."

---

### 3. Component Builder - UI Generation (30 sec)
**Navigate:** Dashboard → Component Builder

**What to do:**
- Type: "Pricing table with 3 tiers, features list, and CTA buttons"
- Click "Generate"
- AI creates the component with Tailwind styling
- Show live preview
- Export to project

**Say:** "Component Builder understands your design system. Every component matches your existing UI."

---

### 4. API Builder - CRUD Endpoints (20 sec)
**Navigate:** Dashboard → API Builder

**What to show:**
- Select "Post" model from dropdown
- Click "Generate CRUD"
- Instantly creates:
  - GET /api/posts (list)
  - POST /api/posts (create)
  - GET /api/posts/[id] (read)
  - PUT /api/posts/[id] (update)
  - DELETE /api/posts/[id] (delete)

**Say:** "API Builder scaffolds complete REST APIs from your Prisma models. With auth, validation, and error handling."

---

### 5. Schema Builder - Database Design (20 sec)
**Navigate:** Dashboard → Schema Builder

**What to do:**
- Type: "E-commerce system with products, orders, and customers"
- AI generates Prisma schema
- Show relationships (Product → Order → Customer)
- One-click migration

**Say:** "Schema Builder designs your database. Relationships, indexes, everything."

---

### 6. Prompt Builder - AI Prompt Engineering (20 sec)
**Navigate:** Dashboard → Prompt Builder

**What to show:**
- Template library (pre-built prompts)
- Version history (A/B testing prompts)
- Variables system {user.name}, {context}
- Test mode with sample data

**Say:** "Prompt Builder helps you design, test, and version AI prompts. Crucial for AI features."

---

## 🏆 The Kicker (30 seconds)

**What you just saw:**
- ✅ **2 months of work** → Available instantly (auth, admin, storage)
- ✅ **6 AI builders** that save 10x time on repetitive tasks
- ✅ **Production-ready** (tests, security, Docker deploy)
- ✅ **Extensible** (add your own builders)

**Built with:** Next.js 14, Prisma, Tailwind, Anthropic Claude

---

## 💬 Common Questions

**Q: "Who is this for?"**
A: "Two audiences: (1) Indie hackers who want to ship fast, (2) Teams who build similar features repeatedly and want to codify their patterns."

**Q: "How is this different from [shadcn, v0, cursor]?"**
A: "Those are great tools. CCPLATE combines them into a complete system. You get the base app PLUS context-aware builders that know your codebase."

**Q: "Can I customize the builders?"**
A: "Yes! Each builder is just a prompt + tool config. You can modify existing builders or create new ones for your specific patterns."

**Q: "What about vendor lock-in?"**
A: "Zero. Generated code is yours. No runtime dependencies. Export and deploy anywhere."

**Q: "Pricing?"**
A: "$49/mo for indie builders, $149/mo for teams. One-time purchase option for $599."

**Q: "What's the business model?"**
A: "SaaS subscription. TAM is 4M+ developers building web apps. Even 0.1% = 4K customers = $2.4M ARR."

---

## 🎯 Key Talking Points

**If they care about:**

**💰 Business Viability:**
- "4M developers building web apps globally"
- "Current tools (Vercel, Railway) have 100K+ paying users"
- "We're 10x faster for the specific use case of SaaS development"

**🛠️ Tech Stack:**
- "Next.js 14 App Router, Prisma ORM, Tailwind CSS"
- "Anthropic Claude for AI (can swap to OpenAI)"
- "Docker + Postgres + Redis for deployment"

**🤖 AI Innovation:**
- "6 specialized builders vs one generic chat"
- "Each builder has domain-specific prompts and tools"
- "Learns from your codebase patterns"

**🧪 Code Quality:**
- "Generated code passes ESLint + TypeScript strict mode"
- "Includes tests for generated components"
- "Security validated (no SQLi, XSS in generated code)"

---

## 🚀 Closing

**End with impact:**
"CCPLATE is the **Rails moment for AI-native development**. You still write code, but the boring parts are automated."

**Call to action:**
- For judges: "Try it yourself - demo login in README"
- For investors: "Looking to raise $750K seed. Deck at ccplate.dev/deck"
- For customers: "Early access at ccplate.dev/beta"

---

## 📊 Demo Tips

**Time this demo: 3 minutes**  
**Practice 3x before presenting**  
**Reset between runs: `npm run reset`**

**If something breaks:**
- "This is a live system, let me show you the code instead"
- Have backup screenshots ready
- Worst case: Show the generated code in the repo

**Pro tip:** Record a video demo as backup. Play it if live demo fails.

---

**Remember:** The magic isn't in perfect execution. It's in showing how AI builders **actually save time** on real tasks developers do every day.
