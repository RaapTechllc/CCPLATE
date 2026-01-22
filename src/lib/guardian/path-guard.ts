import { isSchemaLockedByOther } from './schema-lock';

export interface PathGuardResult {
  allowed: boolean;
  message?: string;
}

export function checkPathAccess(
  path: string,
  operation: 'read' | 'write' | 'edit',
  currentWorktreeId: string
): PathGuardResult {
  // Check if path involves schema.prisma and operation is write/edit
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
