# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.

## 2026-02-03 - Command Injection in Playwright Validation
**Vulnerability:** The Playwright validation utility was using `execSync` with unsanitized string interpolation of test patterns provided via CLI arguments. This allowed for arbitrary command execution (e.g., `ccplate validate run "someTest; echo VULNERABLE"`).

**Learning:** Using `execSync` with template strings for shell commands is extremely risky, even if the input seems constrained. Standardizing on `spawnSync` with `shell: false` and argument arrays is the only reliable way to prevent command injection when shell features are not strictly required.

**Prevention:** Always prefer `spawnSync` or `execFile` with argument arrays and `shell: false`. Conduct a codebase-wide audit for `execSync` and `exec` helpers that use string interpolation and refactor them to use safer alternatives.

## 2026-02-10 - Command Injection in Merge Resolver
**Vulnerability:** The merge conflict resolver (`src/lib/guardian/merge-resolver.ts`) was using `execSync` with template strings to execute `git add` on files with conflicts. This allowed for arbitrary command execution if a repository contained files with malicious names (e.g., `"; touch pwned; "`).

**Learning:** Git filenames can contain arbitrary characters, including shell metacharacters. When processing filenames from `git diff` or other git commands, they must never be directly interpolated into shell command strings.

**Prevention:** Use `spawnSync` with argument arrays and `shell: false` for all git operations involving filenames or other untrusted strings. Standardize on the shared security module's pattern of avoiding shell-based execution for external input.
