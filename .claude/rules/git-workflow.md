# Git Workflow

## Commit Message Format

```
<type>(<scope>): <description>

<optional body>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Examples

```bash
feat(auth): add password reset flow
fix(api): handle null market response
refactor(utils): extract date formatting
docs(readme): update installation steps
test(markets): add integration tests
chore(deps): update dependencies
```

## Pull Request Workflow

When creating PRs:
1. Analyze full commit history (not just latest commit)
2. Use `git diff main...HEAD` to see all changes
3. Draft comprehensive PR summary
4. Include test plan with TODOs
5. Push with `-u` flag if new branch

```bash
# Check what will be in PR
git log main..HEAD --oneline
git diff main...HEAD

# Create PR
gh pr create --title "feat: add feature" --body "## Summary..."
```

## Feature Implementation Workflow

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach**
   - Use **tdd-guide** agent
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format

## Safety Rules

- **NEVER** use `--no-verify`
- **NEVER** force push to main/master
- **NEVER** commit secrets or credentials
- **ALWAYS** review diff before committing
- **ALWAYS** run tests before pushing

## CCPLATE Worktree Workflow

For parallel development:

```bash
# Create isolated worktree
ccplate worktree create feature-name --note "description"

# List worktrees
ccplate worktree list

# Clean up after merge
ccplate worktree cleanup
```

## Branching Strategy

```
main (production)
├── feature/add-auth
├── feature/market-search
├── fix/null-handling
└── chore/update-deps
```
