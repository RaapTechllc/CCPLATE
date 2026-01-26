# Sentinel's Journal

## 2025-05-15 - [Unvalidated Webhook Payload and Command Injection Risks]
**Vulnerability:** External GitHub webhook payloads (specifically `repository.full_name`) were used without validation. Additionally, `execSync` was used with template strings for shell commands.
**Learning:** Even with signature verification, validating all external payload fields is critical for defense-in-depth. `execSync` template interpolation is a common anti-pattern that should be systematically replaced with `spawnSync` and argument arrays.
**Prevention:** Always use `validateRepoName` (or similar) for external strings. Avoid `execSync` with template literals; use `spawnSync` for all shell executions involving variables.
