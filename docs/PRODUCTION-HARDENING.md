# Production Hardening Plan

> CCPLATE Audit Remediation - Phase 4: Production Readiness
> Target: A+ Grade (98%+) | Status: Planning | Date: 2026-02-03

---

## Executive Summary

Following successful audit remediation (88% → 95%+ A grade), this plan outlines the final steps to achieve production-ready status.

**Current State:**
- ✅ Security: Credentials secured, repo hygiene fixed
- ✅ Testing: 117 E2E tests, 258 unit tests, audit-compliance skill active
- ✅ Documentation: CLAUDE.md, TASK.md updated with quality gates
- ⚠️ Observability: Sentry disabled (pending Next.js 16 support check)
- ⚠️ Performance: No load testing on dual database layer (Prisma/Convex)

---

## Phase 4.1: Observability (Sentry Integration)

### Current Status

**Issue:** Sentry disabled in `src/lib/sentry.ts` and `src/instrumentation.ts` with comment:
```typescript
// TODO: Re-enable when @sentry/nextjs supports Next.js 16
```

**Verification Required:**
- [ ] Check if @sentry/nextjs v8.x now supports Next.js 16
- [ ] Review Sentry changelog for Next.js 16 compatibility
- [ ] Test Sentry 8.55.0 (detected in package-lock.json) with Next.js 16.1.4

### Implementation Tasks

**Task 4.1.1: Verify Sentry Compatibility** (15 min)
```bash
# Check latest @sentry/nextjs version
npm view @sentry/nextjs version

# Check Next.js 16 support in Sentry docs
# https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

**Decision Matrix:**
| Scenario | Action |
|----------|--------|
| Sentry supports Next.js 16 | Install @sentry/nextjs, enable in instrumentation |
| Sentry doesn't support yet | Evaluate alternative: LogRocket, Datadog, or custom Winston logging |
| Partial support | Implement with feature flags, monitor for issues |

**Task 4.1.2: Sentry Implementation** (45 min)
If compatible:
```bash
npm install @sentry/nextjs
```

Update `.env.example`:
```bash
# Sentry Error Monitoring
SENTRY_DSN=https://your-sentry-dsn-here
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
NEXT_PUBLIC_SENTRY_DSN=${SENTRY_DSN}
```

Update `src/instrumentation.ts`:
```typescript
import { initSentry } from "@/lib/sentry";

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    initSentry();
  }
}
```

Update `src/lib/sentry.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user);
}

export function addBreadcrumb(
  message: string,
  category?: string,
  level: "info" | "warning" | "error" = "info"
) {
  Sentry.addBreadcrumb({ message, category, level });
}
```

**Task 4.1.3: Error Boundary Integration** (30 min)
Update `src/components/error-boundary.tsx`:
```typescript
import { captureError } from "@/lib/sentry";

// In componentDidCatch:
captureError(error, { component: "ErrorBoundary", errorInfo });
```

**Deliverable:** Sentry active in production, error tracking enabled

---

## Phase 4.2: Performance & Load Testing

### Context

**Dual Database Architecture:**
- **PostgreSQL (Neon):** Prisma ORM for structured data
- **Convex:** Real-time features, auth, analytics

**Risk:** Schema lock system needs validation under load

### Implementation Tasks

**Task 4.2.1: Load Testing Strategy** (30 min)

Define test scenarios:
```yaml
# Scenario 1: Auth Burst
- 100 concurrent login attempts
- Duration: 60 seconds
- Target: <200ms response time
- Database: Convex auth tables

# Scenario 2: AI Builder Load
- 50 concurrent component generations
- Duration: 120 seconds
- Target: <5s generation time
- Database: Convex builderAnalytics

# Scenario 3: File Upload Stress
- 25 concurrent file uploads (1MB each)
- Duration: 60 seconds
- Target: <3s upload time
- Database: PostgreSQL files table

# Scenario 4: Mixed Workload
- 50% reads, 30% writes, 20% AI generation
- Duration: 300 seconds
- Target: 99th percentile <500ms
- Databases: Both PostgreSQL and Convex
```

**Task 4.2.2: Load Testing Tool Selection** (15 min)

Options:
| Tool | Pros | Cons | Recommendation |
|------|------|------|----------------|
| k6 | Scriptable, OSS, CI/CD friendly | Learning curve | ✅ Primary choice |
| Artillery | Easy YAML configs | Less flexible | Alternative |
| Playwright | Already in stack | Not designed for load | Limited use |

**Task 4.2.3: k6 Test Suite Implementation** (90 min)

Create `tests/load/`:
```javascript
// tests/load/auth-burst.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up
    { duration: '3m', target: 100 }, // Stay at 100
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.post('http://localhost:3000/api/auth/login', {
    email: 'load-test@example.com',
    password: 'test-password',
  });

  check(res, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

Create `tests/load/mixed-workload.js`:
```javascript
// Tests both PostgreSQL and Convex paths
import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
  scenarios: {
    reads: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'reads',
    },
    writes: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'writes',
    },
    ai_generation: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      exec: 'aiGeneration',
    },
  },
};

export function reads() {
  group('PostgreSQL reads', () => {
    const res = http.get('http://localhost:3000/api/users/me');
    check(res, { 'status is 200': (r) => r.status === 200 });
  });
}

export function writes() {
  group('Convex writes', () => {
    const res = http.post('http://localhost:3000/api/files', {
      filename: 'test.txt',
      content: 'load test data',
    });
    check(res, { 'status is 200 or 201': (r) => r.status === 200 || r.status === 201 });
  });
}

export function aiGeneration() {
  group('AI Builder (mocked)', () => {
    const res = http.post('http://localhost:3000/api/component-builder/generate', {
      description: 'A button component',
      preferences: { type: 'client', styling: 'tailwind' },
    });
    check(res, { 'status is 200': (r) => r.status === 200 });
  });
}
```

**Task 4.2.4: Schema Lock Load Test** (30 min)

Verify schema lock holds under concurrent migrations:
```javascript
// tests/load/schema-lock.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  iterations: 100,
};

export default function () {
  // Attempt concurrent schema changes
  const res = http.post('http://localhost:3000/api/schema-builder/apply', {
    model: 'LoadTest' + __VU,
  });

  check(res, {
    'no concurrent modification errors': (r) => !r.body.includes('lock'),
    'status is 200 or 423 (locked)': (r) => r.status === 200 || r.status === 423,
  });
}
```

**Deliverable:** Load test suite with baseline metrics

---

## Phase 4.3: Production Deployment Checklist

### Pre-Deploy Verification

- [ ] **Security:** Run `/skill audit-compliance --full`
- [ ] **Tests:** All E2E passing (`npm test`)
- [ ] **Coverage:** 80%+ threshold met
- [ ] **Sentry:** DSN configured, test error captured
- [ ] **Database:** Migrations applied, indexes verified
- [ ] **Environment:** Production env vars set (no .env.local on server)
- [ ] **Monitoring:** Health check endpoint responding
- [ ] **Rollback Plan:** Previous deployment tagged, can revert in <5 min

### Deployment Steps

1. **Staging Deploy**
   ```bash
   vercel --target=staging
   ```
   - Run E2E tests against staging
   - Verify Sentry receives errors
   - Check load test baseline

2. **Production Deploy**
   ```bash
   vercel --target=production
   ```
   - Monitor error rates for 30 min
   - Check response times
   - Validate database connections

3. **Post-Deploy Validation**
   - Health check: `curl https://ccplate.com/api/health`
   - Sentry: Verify first error captured
   - Analytics: Confirm builder events logging

---

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Error Tracking | 100% of errors captured | Sentry dashboard |
| Response Time | p99 < 500ms | k6 load tests |
| Availability | 99.9% uptime | Vercel analytics |
| Database Load | < 50% CPU at peak | Neon/Convex dashboards |
| Error Rate | < 0.1% | Sentry + Vercel |

---

## Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| 4.1 Sentry Integration | 2-3 hours | Agent |
| 4.2 Load Testing Suite | 3-4 hours | Agent |
| 4.3 Production Deploy | 1 hour | User + Agent |
| **Total** | **6-8 hours** | - |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Sentry still incompatible | Fallback to Winston + LogRocket |
| Load test failures | Optimize queries, add caching layer |
| Database overload | Implement connection pooling, rate limiting |
| Deployment rollback | Tag releases, maintain rollback script |

---

**Next Action:** Approve this plan to begin Phase 4.1 (Sentry compatibility check)

---

*Document Version: 1.0*
*Created: 2026-02-03*
*Audit Grade Target: A (95%+) → A+ (98%+)*
