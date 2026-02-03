# CCPLATE Load Testing Suite

This directory contains k6 load tests for CCPLATE production readiness validation.

## Prerequisites

Install k6:
- **Windows (Chocolatey):** `choco install k6`
- **Windows (winget):** `winget install k6`
- **macOS (Homebrew):** `brew install k6`
- **Linux:** `sudo gpg -k && sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C802E3D63CE35E6B3F6C61F565D1A7D5C7 && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && sudo apt-get update && sudo apt-get install k6`
- **Docker:** `docker pull grafana/k6`

## Test Scenarios

### 1. Auth Burst Test (`auth-burst.js`)
Tests concurrent authentication requests to validate Convex auth performance.

```bash
k6 run tests/load/auth-burst.js
```

**Targets:**
- 100 concurrent login attempts
- p99 response time < 200ms
- Error rate < 1%

### 2. AI Builder Load Test (`ai-builder-load.js`)
Simulates concurrent AI component generation requests.

```bash
k6 run tests/load/ai-builder-load.js
```

**Targets:**
- 50 concurrent AI generations
- p99 response time < 5s
- Error rate < 5% (AI generation can have higher variance)

### 3. Mixed Workload Test (`mixed-workload.js`)
Combined read/write/AI operations to test dual database layer.

```bash
k6 run tests/load/mixed-workload.js
```

**Targets:**
- 50% reads (PostgreSQL), 30% writes (Convex), 20% AI generations
- p99 response time < 500ms (reads), < 2s (writes), < 5s (AI)
- Error rate < 1%

### 4. Schema Lock Test (`schema-lock.js`)
Validates schema lock prevents concurrent modifications.

```bash
k6 run tests/load/schema-lock.js
```

**Targets:**
- No data corruption under concurrent schema changes
- 423 (Locked) status codes returned appropriately
- 100% successful lock acquisition

## Running All Tests

```bash
# Run all tests sequentially
k6 run tests/load/auth-burst.js
k6 run tests/load/ai-builder-load.js
k6 run tests/load/mixed-workload.js
k6 run tests/load/schema-lock.js
```

## CI/CD Integration

Add to your GitHub Actions:

```yaml
- name: Run Load Tests
  run: |
    k6 run --summary-export=load-test-summary.json tests/load/mixed-workload.js
```

## Interpreting Results

- **http_req_duration:** Response time metrics (p95, p99)
- **http_req_failed:** Error rate percentage
- **checks:** Pass/fail of custom assertions
- **iterations:** Total requests completed

## Environment Variables

- `BASE_URL`: Target URL (default: http://localhost:3000)
- `TEST_USER_EMAIL`: Test user for auth tests
- `TEST_USER_PASSWORD`: Test user password
- `API_KEY`: For API builder tests

Example:
```bash
BASE_URL=https://staging.ccplate.com k6 run tests/load/auth-burst.js
```
