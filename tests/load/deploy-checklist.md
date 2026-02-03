# Production Deployment Checklist

> CCPLATE Production Readiness Checklist
> Target: A+ Grade (98%+)

## Pre-Deploy Verification

Run these checks before any production deployment:

### 1. Security Audit
```bash
# Run audit-compliance skill
npx ts-node .claude/skills/audit-compliance/index.ts --full
```
- [ ] No .env files in git tracking
- [ ] No API keys in source code
- [ ] No sensitive data in logs
- [ ] Security gates passing

### 2. Test Suite
```bash
# Run all tests
npm run test:unit
npm test
```
- [ ] All 258+ unit tests passing
- [ ] All 117 E2E tests passing
- [ ] Code coverage ≥ 80%
- [ ] No test flakiness

### 3. Sentry Configuration
```bash
# Verify Sentry is configured
```
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in production
- [ ] Sentry client config valid
- [ ] Sentry server config valid
- [ ] Error Boundary integrated
- [ ] Test error captured in Sentry dashboard

### 4. Database Readiness
```bash
# Verify database state
npx prisma migrate status
npx convex deploy --dry-run
```
- [ ] All migrations applied
- [ ] Indexes created and verified
- [ ] Connection pools configured
- [ ] Backup strategy confirmed

### 5. Environment Variables
```bash
# Check production env vars
cat .env.production | grep -E '^(NEXT_PUBLIC|SENTRY|DATABASE)'
```
- [ ] No .env.local on production server
- [ ] All required variables set
- [ ] No debug/test values in production
- [ ] Secrets properly encrypted/managed

### 6. Performance Baseline
```bash
# Run load tests against staging
BASE_URL=https://staging.ccplate.com npm run test:load:mixed
```
- [ ] p99 response time < 500ms
- [ ] Error rate < 0.1%
- [ ] Schema lock holds under load
- [ ] Database CPU < 50% at peak

### 7. Health Checks
```bash
# Verify health endpoints
curl https://staging.ccplate.com/api/health
curl https://staging.ccplate.com/api/ready
```
- [ ] Health endpoint responding 200
- [ ] Readiness probe passing
- [ ] All dependencies responding

---

## Deployment Steps

### Step 1: Staging Deploy
```bash
# Deploy to staging
vercel --target=staging

# Tag the deployment
git tag -a v$(date +%Y%m%d-%H%M%S)-staging -m "Staging deployment"
```

**Post-Staging Verification:**
- [ ] E2E tests pass against staging
- [ ] Sentry receives test error
- [ ] Load test baseline established
- [ ] Manual smoke tests complete

### Step 2: Production Deploy
```bash
# Create backup tag of current production
git tag -a production-backup-$(date +%Y%m%d) -m "Pre-deployment backup"

# Deploy to production
vercel --target=production

# Tag the release
git tag -a v$(date +%Y%m%d-%H%M%S) -m "Production deployment"
```

### Step 3: Post-Deploy Validation (30-minute window)

**Immediate (0-5 min):**
```bash
# Verify deployment live
curl -s https://ccplate.com/api/health | jq .
```
- [ ] Site responding
- [ ] Health check passing
- [ ] No immediate 5xx errors

**Short-term (5-30 min):**
- [ ] Error rate in Sentry < 0.1%
- [ ] Response times normal (p99 < 500ms)
- [ ] Database connections stable
- [ ] User login flow working
- [ ] AI Builder generating components

**Monitoring Dashboards:**
- [ ] Vercel Analytics - no traffic drop
- [ ] Sentry - no error spike
- [ ] Neon (PostgreSQL) - CPU/memory normal
- [ ] Convex dashboard - no alerts

---

## Rollback Plan

If issues detected during 30-minute window:

```bash
# Rollback to previous deployment
vercel --target=production --version=<previous-version-id>

# Or rollback via git tag
git checkout production-backup-<date>
vercel --target=production
```

**Rollback Triggers:**
- Error rate > 1%
- p99 response time > 2s
- Any 5xx errors in auth flow
- Database connection failures
- User reports critical issues

---

## Success Criteria (A+ Grade)

| Metric | Target | Verification |
|--------|--------|--------------|
| **Error Tracking** | 100% coverage | Sentry dashboard |
| **Response Time** | p99 < 500ms | k6 load tests |
| **Availability** | 99.9% uptime | Vercel analytics |
| **Database Load** | < 50% CPU | Neon/Convex dashboards |
| **Error Rate** | < 0.1% | Sentry + Vercel |
| **Test Coverage** | ≥ 80% | npm run test:unit:coverage |
| **E2E Tests** | 117 passing | npm test |
| **Security Audit** | 0 critical issues | audit-compliance skill |

---

## Post-Deployment Tasks

- [ ] Monitor error rates for 24 hours
- [ ] Review performance metrics
- [ ] Document any issues in TASK.md
- [ ] Update runbooks if procedures changed
- [ ] Notify team of successful deployment
- [ ] Schedule next deployment planning

---

## Emergency Contacts

- **Primary On-call:** [Your contact]
- **Secondary:** [Team member]
- **Database Admin:** [If separate]
- **Sentry Alerts:** [Your Sentry org]

---

*Last updated: 2026-02-03*
*Document Version: 1.0*
