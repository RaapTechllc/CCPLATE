# CCPLATE Data Codemap

> Generated: 2026-01-25T00:00:00Z
> Freshness: CURRENT

## Database Schema (prisma/schema.prisma)

### Models

```
┌─────────────────┐     ┌─────────────────┐
│      User       │────▶│    Account      │
│  (auth/profile) │     │   (OAuth)       │
└────────┬────────┘     └─────────────────┘
         │
         ├──────────────┬──────────────────┐
         ▼              ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    Session      │ │     File        │ │ EmailVerif...   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### User Model
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  lastLoginAt   DateTime?

  accounts                Account[]
  sessions                Session[]
  files                   File[]
  emailVerificationTokens EmailVerificationToken[]
  passwordResetTokens     PasswordResetToken[]
}
```

### Account Model (OAuth)
```prisma
model Account {
  id                String @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  @@unique([provider, providerAccountId])
}
```

### Session Model
```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
}
```

### File Model
```prisma
model File {
  id           String      @id @default(cuid())
  filename     String      // stored filename (UUID)
  originalName String      // original upload name
  mimeType     String
  size         Int         // bytes
  url          String
  storageType  StorageType @default(LOCAL)
  userId       String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?   // soft delete
}
```

### Token Models
```prisma
model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String   @unique
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

### System Settings Model
```prisma
model SystemSetting {
  id       String      @id @default(cuid())
  key      String      @unique
  value    String      @db.Text
  type     SettingType @default(STRING)
  category String      @default("general")
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

### Enums
```prisma
enum Role {
  USER
  ADMIN
}

enum StorageType {
  LOCAL
  S3
  R2
}

enum SettingType {
  STRING
  NUMBER
  BOOLEAN
  JSON
}
```

## Memory/State Files (memory/)

### JSON Files
| File | Schema | Purpose |
|------|--------|---------|
| `workflow-state.json` | WorkflowState | PRD, phase, status |
| `guardian-state.json` | GuardianState | Nudge cooldowns, ticks |
| `context-ledger.json` | ContextLedger | Context pressure tracking |
| `prd.json` | PRD | Frozen product requirements |

### JSONL Files (append-only)
| File | Record Type | Purpose |
|------|-------------|---------|
| `guardian-nudges.jsonl` | NudgeEntry | Nudge history |
| `audit-log.jsonl` | AuditEntry | Audit trail |
| `merge-ledger.jsonl` | MergeEntry | Merge history |
| `guardian-errors.log` | ErrorEntry | Error log |

### Markdown Files
| File | Purpose |
|------|---------|
| `ACTIVITY.md` | Human-readable activity log |
| `prd.md` | Human-readable PRD |

### Harness Reports (memory/harness/)
| File | Purpose |
|------|---------|
| `run-{id}.json` | Harness run state |
| `report-{id}.md` | Harness comparison report |

## TypeScript Types (src/types/)

### auth.ts
```typescript
interface Session {
  user: User
  expires: string
}

interface User {
  id: string
  name?: string
  email: string
  role: Role
}
```

### admin.ts
```typescript
interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalFiles: number
  storageUsed: number
}

interface UserListItem {
  id: string
  name: string
  email: string
  role: Role
  createdAt: Date
}
```

### file.ts
```typescript
interface FileUpload {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
}

interface FileRecord {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
}
```

### settings.ts
```typescript
interface SystemSetting {
  key: string
  value: string
  type: SettingType
  category: string
}
```

### worktree.ts
```typescript
interface Worktree {
  id: string
  path: string
  branch: string
  note?: string
  createdAt: Date
}
```

## Database Access Patterns

### Prisma Client
```typescript
import { PrismaClient } from '@/generated/prisma'
const prisma = new PrismaClient()

// Soft delete pattern
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() }
})

// Exclude soft-deleted
await prisma.user.findMany({
  where: { deletedAt: null }
})
```

### Generated Output
- Location: `src/generated/prisma/`
- Auto-generated by `npm run db:generate`
- Type-safe query builder

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   API       │────▶│   Prisma    │
│   (React)   │     │   Routes    │     │   Client    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  PostgreSQL │
                                        └─────────────┘
```

## Indexes

| Model | Index Fields | Purpose |
|-------|--------------|---------|
| User | deletedAt | Filter active users |
| Account | userId | User's accounts |
| Session | userId | User's sessions |
| File | userId, mimeType, deletedAt | File queries |
| SystemSetting | category | Settings by category |
