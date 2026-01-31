# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.

## 2026-01-22 - Systematic Command Injection Risk in CLI operations
**Vulnerability:** Widespread use of `execSync` with template literals for shell commands (Git operations, Playwright tests) in `ccplate.ts` and `playwright-validation.ts`. This allowed potential command injection if input (like test patterns or worktree IDs) contained shell metacharacters.

**Learning:** Relying on manual input validation for every CLI argument used in a shell command is error-prone. Standardizing on a hardened `exec` wrapper that uses `spawnSync` with `shell: false` and argument arrays provides a much safer default that is immune to shell injection.

**Prevention:** Never use `execSync` or `exec` with string interpolation for external or variable input. Always prefer `spawnSync` or `execFile` with argument arrays and `shell: false`.
