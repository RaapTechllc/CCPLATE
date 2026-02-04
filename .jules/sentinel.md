# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.

## 2026-02-02 - Command Injection in Playwright and Git Operations
**Vulnerability:** Multiple modules (`playwright-validation.ts`, `validation-loop.ts`, `merge-resolver.ts`, `snapshots.ts`) were using `execSync` with template strings, allowing command injection via unvalidated input (e.g., test patterns, file paths, commit hashes).
**Learning:** `execSync` is highly dangerous when combined with string interpolation. Even if inputs seem trusted, they can be manipulated by malicious agents or users to execute arbitrary code. Refactoring to `spawnSync` with `shell: false` and argument arrays provides a robust defense, but requires careful handling of exit codes which `spawnSync` doesn't throw as exceptions.
**Prevention:** Always use `spawnSync` or `execFile` with argument arrays and `shell: false`. Explicitly check `result.status !== 0` to maintain proper error handling. Avoid `execSync` for any command that includes dynamic data.
