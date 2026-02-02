# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.

## 2026-02-01 - Command Injection in Playwright and Git operations
**Vulnerability:** Several modules in the Guardian core (`playwright-validation.ts`, `merge-resolver.ts`) were using `execSync` with string interpolation to run shell commands. Unsanitized input from test patterns or filenames could lead to arbitrary command execution.

**Learning:** `execSync` with template strings is inherently dangerous when any part of the command comes from external input or even filesystem metadata (which could be manipulated). The shell interprets metacharacters like `;`, `&`, `|`, and ` ` ` ` (backticks).

**Prevention:** Always use `spawnSync` or `execFile` with argument arrays and `shell: false`. This ensures that arguments are passed directly to the executable without being interpreted by a shell, effectively neutralizing command injection attacks.
