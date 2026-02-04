# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.

## 2026-02-03 - Command Injection in Playwright Validation
**Vulnerability:** The Playwright validation utility was using `execSync` with unsanitized string interpolation of test patterns provided via CLI arguments. This allowed for arbitrary command execution (e.g., `ccplate validate run "someTest; echo VULNERABLE"`).

**Learning:** Using `execSync` with template strings for shell commands is extremely risky, even if the input seems constrained. Standardizing on `spawnSync` with `shell: false` and argument arrays is the only reliable way to prevent command injection when shell features are not strictly required.

**Prevention:** Always prefer `spawnSync` or `execFile` with argument arrays and `shell: false`. Conduct a codebase-wide audit for `execSync` and `exec` helpers that use string interpolation and refactor them to use safer alternatives.
