# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.

## 2026-01-26 - Command Injection in Playwright Validation Utility
**Vulnerability:** The Playwright validation utility (`src/lib/guardian/playwright-validation.ts`) was using `execSync` with string concatenation to run tests. A malicious test pattern passed via the CLI (e.g., `; touch /tmp/pwned`) could execute arbitrary shell commands.

**Learning:** Internal tools and "validation" helpers can often be overlooked as attack vectors. Even if they are intended for developer use, they should follow the same security standards as production code, especially when they handle strings that might come from external or user-provided sources.

**Prevention:** Always prefer `spawnSync` with `shell: false` and argument arrays over `execSync` with strings. Centralize secure execution logic in a shared security module to ensure consistent application of this pattern across the codebase.
