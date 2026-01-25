/**
 * Input Validation Module
 *
 * Security-critical validation functions for preventing command injection
 * and other input-based attacks in the Guardian system.
 *
 * SECURITY NOTE: These functions are the first line of defense against
 * command injection attacks. All external input (webhooks, CLI args, etc.)
 * MUST be validated before use in shell commands or file operations.
 */

/**
 * Security error thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Maximum allowed value for issue/PR numbers
 * GitHub's max issue number is around 2^31-1
 */
const MAX_ISSUE_NUMBER = 2147483647;

/**
 * Pattern for safe identifiers (worktree IDs, task IDs, etc.)
 * - Must start with lowercase letter or number
 * - Can contain lowercase letters, numbers, dots, underscores, hyphens
 * - Max 64 characters
 */
const SAFE_IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

/**
 * Pattern for git commit hashes (short or full)
 * - 7-40 hexadecimal characters
 */
const GIT_HASH_PATTERN = /^[0-9a-f]{7,40}$/;

/**
 * Pattern for git branch names
 * - Allows alphanumeric, hyphens, underscores, forward slashes, dots
 * - Cannot start with hyphen, dot, or forward slash
 * - Cannot contain consecutive dots or slashes
 * - Max 255 characters
 */
const GIT_BRANCH_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]{0,254}$/;

/**
 * Shell metacharacters that could enable command injection
 */
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>\\!#*?"'\n\r\t]/;

/**
 * Validates that a value is a positive integer within bounds
 * Used for: issue numbers, PR numbers, comment IDs, etc.
 *
 * @param value - The value to validate (can be string or number)
 * @param fieldName - Name of the field for error messages
 * @param maxValue - Maximum allowed value (default: MAX_ISSUE_NUMBER)
 * @returns The validated number
 * @throws ValidationError if validation fails
 *
 * @example
 * ```ts
 * const issueNum = validatePositiveInteger(req.body.issueNumber, 'issueNumber');
 * // Returns number if valid, throws ValidationError if invalid
 * ```
 */
export function validatePositiveInteger(
  value: unknown,
  fieldName: string,
  maxValue: number = MAX_ISSUE_NUMBER
): number {
  // Handle undefined/null
  if (value === undefined || value === null) {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName,
      value
    );
  }

  // Convert string to number if needed
  let num: number;
  if (typeof value === 'string') {
    // Reject strings with shell metacharacters
    if (SHELL_METACHARACTERS.test(value)) {
      throw new ValidationError(
        `${fieldName} contains invalid characters`,
        fieldName,
        value
      );
    }
    num = parseInt(value, 10);
  } else if (typeof value === 'number') {
    num = value;
  } else {
    throw new ValidationError(
      `${fieldName} must be a number or numeric string`,
      fieldName,
      value
    );
  }

  // Validate the number
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    throw new ValidationError(
      `${fieldName} must be a valid number`,
      fieldName,
      value
    );
  }

  if (!Number.isInteger(num)) {
    throw new ValidationError(
      `${fieldName} must be an integer`,
      fieldName,
      value
    );
  }

  if (num < 1) {
    throw new ValidationError(
      `${fieldName} must be a positive integer (got ${num})`,
      fieldName,
      value
    );
  }

  if (num > maxValue) {
    throw new ValidationError(
      `${fieldName} exceeds maximum allowed value of ${maxValue}`,
      fieldName,
      value
    );
  }

  return num;
}

/**
 * Validates that a value is a safe identifier for use in file paths
 * and shell commands without escaping.
 *
 * Used for: worktree IDs, task IDs, job IDs, etc.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param pattern - Custom pattern to use (default: SAFE_IDENTIFIER_PATTERN)
 * @returns The validated string
 * @throws ValidationError if validation fails
 *
 * @example
 * ```ts
 * const worktreeId = validateSafeIdentifier(input, 'worktreeId');
 * // Safe to use in: `git worktree add ${worktreeId}`
 * ```
 */
export function validateSafeIdentifier(
  value: unknown,
  fieldName: string,
  pattern: RegExp = SAFE_IDENTIFIER_PATTERN
): string {
  if (value === undefined || value === null) {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName,
      value
    );
  }

  if (typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string`,
      fieldName,
      value
    );
  }

  if (value.length === 0) {
    throw new ValidationError(
      `${fieldName} cannot be empty`,
      fieldName,
      value
    );
  }

  // Check for shell metacharacters first (provides clearer error message)
  if (SHELL_METACHARACTERS.test(value)) {
    throw new ValidationError(
      `${fieldName} contains shell metacharacters`,
      fieldName,
      value
    );
  }

  if (!pattern.test(value)) {
    throw new ValidationError(
      `${fieldName} contains invalid characters or format. ` +
      `Must start with lowercase letter/number, contain only lowercase letters, ` +
      `numbers, dots, underscores, hyphens, and be 1-64 characters`,
      fieldName,
      value
    );
  }

  return value;
}

/**
 * Validates a git reference (commit hash or branch name)
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param type - Type of ref: 'hash' for commit hashes, 'branch' for branch names, 'any' for either
 * @returns The validated string
 * @throws ValidationError if validation fails
 *
 * @example
 * ```ts
 * const hash = validateGitRef(commit, 'commitHash', 'hash');
 * // Safe to use in: `git rev-parse ${hash}`
 * ```
 */
export function validateGitRef(
  value: unknown,
  fieldName: string,
  type: 'hash' | 'branch' | 'any' = 'any'
): string {
  if (value === undefined || value === null) {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName,
      value
    );
  }

  if (typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string`,
      fieldName,
      value
    );
  }

  if (value.length === 0) {
    throw new ValidationError(
      `${fieldName} cannot be empty`,
      fieldName,
      value
    );
  }

  // Check for shell metacharacters
  if (SHELL_METACHARACTERS.test(value)) {
    throw new ValidationError(
      `${fieldName} contains shell metacharacters`,
      fieldName,
      value
    );
  }

  // Validate based on type
  const isValidHash = GIT_HASH_PATTERN.test(value);
  const isValidBranch = GIT_BRANCH_PATTERN.test(value);

  switch (type) {
    case 'hash':
      if (!isValidHash) {
        throw new ValidationError(
          `${fieldName} must be a valid git commit hash (7-40 hex characters)`,
          fieldName,
          value
        );
      }
      break;
    case 'branch':
      if (!isValidBranch) {
        throw new ValidationError(
          `${fieldName} must be a valid git branch name`,
          fieldName,
          value
        );
      }
      break;
    case 'any':
      if (!isValidHash && !isValidBranch) {
        throw new ValidationError(
          `${fieldName} must be a valid git reference (commit hash or branch name)`,
          fieldName,
          value
        );
      }
      break;
  }

  return value;
}

/**
 * Escapes a string for safe use in shell commands
 *
 * SECURITY NOTE: This is a FALLBACK only. Prefer using spawnSync with
 * argument arrays instead of string interpolation.
 *
 * @param arg - The argument to escape
 * @returns The escaped string wrapped in single quotes
 *
 * @example
 * ```ts
 * // AVOID: Direct interpolation
 * execSync(`echo ${userInput}`);  // DANGEROUS!
 *
 * // BETTER: Use escapeShellArg (still not ideal)
 * execSync(`echo ${escapeShellArg(userInput)}`);
 *
 * // BEST: Use spawnSync with argument array
 * spawnSync('echo', [userInput]);
 * ```
 */
export function escapeShellArg(arg: string): string {
  // Single quotes escape everything except single quotes themselves
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Validates a file path to prevent directory traversal attacks
 *
 * @param value - The path to validate
 * @param fieldName - Name of the field for error messages
 * @param options - Validation options
 * @returns The validated path
 * @throws ValidationError if validation fails
 */
export function validatePath(
  value: unknown,
  fieldName: string,
  options: {
    allowAbsolute?: boolean;
    maxLength?: number;
  } = {}
): string {
  const { allowAbsolute = false, maxLength = 500 } = options;

  if (value === undefined || value === null) {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName,
      value
    );
  }

  if (typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string`,
      fieldName,
      value
    );
  }

  if (value.length === 0) {
    throw new ValidationError(
      `${fieldName} cannot be empty`,
      fieldName,
      value
    );
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} exceeds maximum length of ${maxLength}`,
      fieldName,
      value
    );
  }

  // Check for null bytes (path injection)
  if (value.includes('\0')) {
    throw new ValidationError(
      `${fieldName} contains null bytes`,
      fieldName,
      value
    );
  }

  // Check for directory traversal
  if (value.includes('..')) {
    throw new ValidationError(
      `${fieldName} contains directory traversal sequence (..)`,
      fieldName,
      value
    );
  }

  // Check for absolute paths if not allowed
  if (!allowAbsolute) {
    // Unix absolute path
    if (value.startsWith('/')) {
      throw new ValidationError(
        `${fieldName} must be a relative path`,
        fieldName,
        value
      );
    }
    // Windows absolute path
    if (/^[A-Za-z]:[\\/]/.test(value)) {
      throw new ValidationError(
        `${fieldName} must be a relative path`,
        fieldName,
        value
      );
    }
  }

  return value;
}

/**
 * Validates that a value is one of the allowed options
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param allowedValues - Array of allowed values
 * @returns The validated value
 * @throws ValidationError if validation fails
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (value === undefined || value === null) {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName,
      value
    );
  }

  if (typeof value !== 'string') {
    throw new ValidationError(
      `${fieldName} must be a string`,
      fieldName,
      value
    );
  }

  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName,
      value
    );
  }

  return value as T;
}

/**
 * Validates optional positive integer (returns undefined if not provided)
 */
export function validateOptionalPositiveInteger(
  value: unknown,
  fieldName: string,
  maxValue: number = MAX_ISSUE_NUMBER
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return validatePositiveInteger(value, fieldName, maxValue);
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}
