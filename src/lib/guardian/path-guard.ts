import { isSchemaLockedByOther } from './schema-lock';

export interface PathGuardResult {
  allowed: boolean;
  message?: string;
}

export interface ProtectedPattern {
  pattern: string;
  operations: ('read' | 'write' | 'edit')[];
  message?: string;
}

const DEFAULT_PROTECTED_PATTERNS: ProtectedPattern[] = [
  { pattern: '*.key', operations: ['read', 'write', 'edit'], message: 'Key files are protected' },
  { pattern: '*.pem', operations: ['read', 'write', 'edit'], message: 'PEM certificate files are protected' },
  { pattern: '.env*', operations: ['write', 'edit'], message: 'Environment files are protected from modification' },
  { pattern: '**/.git/**', operations: ['write', 'edit'], message: 'Git internals are protected' },
  { pattern: '**/node_modules/**', operations: ['write', 'edit'], message: 'node_modules should not be modified directly' },
];

/**
 * Converts a glob pattern to a properly anchored regex.
 * 
 * SECURITY: All patterns are anchored with ^ and $ to prevent bypass attacks.
 * Without anchoring:
 *   - Pattern "*.key" would match "not-a-key" (partial match on "a-key")
 *   - Pattern "foo/*.ts" would match "foo/bar.ts.bak"
 * 
 * With proper anchoring:
 *   - Pattern "*.key" only matches files ending in .key (e.g., "secret.key")
 *   - Pattern "foo/*.ts" only matches .ts files in foo/ (not .ts.bak)
 * 
 * @param pattern Glob-style pattern (supports *, **, ?)
 * @returns Anchored RegExp that matches the full path
 */
export function globToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*')
    .replace(/\?/g, '[^/]');
  
  return new RegExp(`^${regexStr}$`);
}

/**
 * Tests if a path matches a glob pattern using properly anchored regex.
 * 
 * @param path The file path to test
 * @param pattern Glob-style pattern
 * @returns true if the path matches the pattern exactly
 * 
 * @example
 * matchesPattern('secret.key', '*.key') // true
 * matchesPattern('not-a-key', '*.key') // false (would be true without anchoring!)
 * matchesPattern('foo/bar.ts', 'foo/*.ts') // true
 * matchesPattern('foo/bar.ts.bak', 'foo/*.ts') // false (would be true without anchoring!)
 */
export function matchesPattern(path: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(path);
}

/**
 * Checks if a path matches any of the protected patterns for the given operation.
 */
export function isPathProtected(
  path: string,
  operation: 'read' | 'write' | 'edit',
  patterns: ProtectedPattern[] = DEFAULT_PROTECTED_PATTERNS
): { protected: boolean; message?: string } {
  const normalizedPath = path.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').pop() || normalizedPath;
  
  for (const p of patterns) {
    if (!p.operations.includes(operation)) continue;
    
    if (matchesPattern(normalizedPath, p.pattern) || matchesPattern(filename, p.pattern)) {
      return { protected: true, message: p.message };
    }
  }
  
  return { protected: false };
}

export function checkPathAccess(
  path: string,
  operation: 'read' | 'write' | 'edit',
  currentWorktreeId: string,
  customPatterns?: ProtectedPattern[]
): PathGuardResult {
  const protectionCheck = isPathProtected(path, operation, customPatterns);
  if (protectionCheck.protected) {
    return {
      allowed: false,
      message: protectionCheck.message || `Path '${path}' is protected for ${operation} operations`,
    };
  }

  if (
    (operation === 'write' || operation === 'edit') &&
    path.includes('schema.prisma')
  ) {
    const lockHolder = isSchemaLockedByOther(currentWorktreeId);
    if (lockHolder) {
      return {
        allowed: false,
        message: `Schema locked by worktree '${lockHolder.worktreeId}' for ${lockHolder.operation}. Wait or request lock with 'ccplate schema lock'.`,
      };
    }
  }

  return { allowed: true };
}
