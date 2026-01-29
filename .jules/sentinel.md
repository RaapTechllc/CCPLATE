# Sentinel Journal - Critical Security Learnings

## 2026-01-21 - Missing Validation on GitHub Webhook Repository Name
**Vulnerability:** The GitHub webhook endpoint (`src/app/api/webhooks/github/route.ts`) was using the repository name from the payload directly in GitHub API URLs and other logic without validation. While signature verification was present, a compromised or malicious webhook payload could potentially attempt SSRF or path traversal if the repository name was manipulated (e.g., `../../malicious/path`).

**Learning:** Even with signature verification, external payloads should be treated as untrusted. Critical fields like repository names, which are used to construct URLs or file paths, must be strictly validated against expected patterns (e.g., `owner/repo`).

**Prevention:** Implement and enforce strict runtime validation (using Zod or manual regex-based validation) for all fields in external payloads. Shared security modules should provide reusable validation functions for common patterns like repository names.
