# Sentinel Security Journal

## 2025-05-22 - [CRITICAL] Command Injection via GitHub Webhook Payloads
**Vulnerability:** Command injection in `job-executor.ts` via unsanitized `issue.number` from GitHub webhooks. Unverified webhook payloads could contain strings like `1; rm -rf /` in the `number` field, which was then concatenated into a shell command in `execSync`.
**Learning:** Casting to `number` in TypeScript (`as number`) provides NO runtime validation. External payloads must be explicitly validated (e.g., `Number(val)` and `isNaN` check) and shell commands should use `spawnSync` with argument arrays instead of `execSync` with template strings.
**Prevention:** Always validate external inputs using proper runtime checks (Zod or native types). Prefer `spawnSync`/`execFile` over `execSync`.
