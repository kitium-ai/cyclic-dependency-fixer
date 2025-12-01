/**
 * Centralized error handling with KitiumError factory functions
 * Provides structured error types for cyclic-dependency-fixer operations
 */

import { KitiumError, type ErrorSeverity } from '@kitiumai/error';

/**
 * Error metadata for structured logging and error tracking
 */
export interface ErrorMetadata {
  code: string;
  kind: string;
  severity: ErrorSeverity;
  statusCode: number;
  retryable: boolean;
  help?: string;
  docs?: string;
}

/**
 * Extract error metadata from KitiumError for logging
 */
export function extractErrorMetadata(error: unknown): ErrorMetadata {
  if (error instanceof KitiumError) {
    const kitiumError = error as any;
    return {
      code: kitiumError.code,
      kind: kitiumError.kind,
      severity: kitiumError.severity,
      statusCode: kitiumError.statusCode,
      retryable: kitiumError.retryable,
      help: kitiumError.help,
      docs: kitiumError.docs,
    };
  }

  return {
    code: 'cycfix/unknown',
    kind: 'unknown',
    severity: 'error',
    statusCode: 500,
    retryable: false,
  };
}

/**
 * File system operation failed
 */
export function createFileSystemError(
  operation: string,
  filePath: string,
  cause?: string,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/file-system',
    message: `File system operation failed: ${operation} on ${filePath}${cause ? ` - ${cause}` : ''}`,
    statusCode: 400,
    severity: 'error',
    kind: 'file_system_error',
    retryable: true,
    help: 'Ensure the file path is valid and you have read/write permissions',
    docs: 'https://docs.kitium.ai/errors/cycfix/file-system',
    context: { operation, filePath, cause, ...context },
  });
}

/**
 * Parser error (JavaScript or TypeScript)
 */
export function createParserError(
  parserName: string,
  filePath: string,
  parseError: string,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/parser',
    message: `Failed to parse file with ${parserName}: ${filePath} - ${parseError}`,
    statusCode: 400,
    severity: 'warning',
    kind: 'parser_error',
    retryable: false,
    help: 'Check file syntax and ensure it is valid JavaScript or TypeScript',
    docs: 'https://docs.kitium.ai/errors/cycfix/parser',
    context: { parserName, filePath, parseError, ...context },
  });
}

/**
 * Cycle detection failed
 */
export function createCycleDetectionError(
  reason: string,
  moduleCount?: number,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/cycle-detection',
    message: `Cycle detection failed: ${reason}`,
    statusCode: 500,
    severity: 'error',
    kind: 'cycle_detection_error',
    retryable: true,
    help: 'Try reducing the number of files to analyze or increase memory limits',
    docs: 'https://docs.kitium.ai/errors/cycfix/cycle-detection',
    context: { reason, moduleCount, ...context },
  });
}

/**
 * Fix strategy operation failed
 */
export function createFixStrategyError(
  strategyName: string,
  cycle: string,
  reason: string,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/fix-strategy',
    message: `Fix strategy ${strategyName} failed for cycle ${cycle}: ${reason}`,
    statusCode: 422,
    severity: 'warning',
    kind: 'fix_strategy_error',
    retryable: true,
    help: 'Try different fix strategies or apply manual fixes',
    docs: 'https://docs.kitium.ai/errors/cycfix/fix-strategy',
    context: { strategyName, cycle, reason, ...context },
  });
}

/**
 * Configuration error
 */
export function createConfigurationError(
  field: string,
  reason: string,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/configuration',
    message: `Configuration error in field '${field}': ${reason}`,
    statusCode: 400,
    severity: 'error',
    kind: 'configuration_error',
    retryable: false,
    help: 'Check your cycfix.config.json and command-line arguments',
    docs: 'https://docs.kitium.ai/errors/cycfix/configuration',
    context: { field, reason, ...context },
  });
}

/**
 * AI provider error
 */
export function createAIProviderError(
  providerName: string,
  operation: string,
  error: string,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/ai-provider',
    message: `AI provider error (${providerName}): ${operation} failed - ${error}`,
    statusCode: 503,
    severity: 'warning',
    kind: 'ai_provider_error',
    retryable: true,
    help: 'Check your API credentials and rate limits. Ensure your API key is valid and has sufficient quota',
    docs: 'https://docs.kitium.ai/errors/cycfix/ai-provider',
    context: { providerName, operation, error, ...context },
  });
}

/**
 * Cache operation failed
 */
export function createCacheOperationError(
  operation: string,
  reason: string,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/cache',
    message: `Cache operation failed (${operation}): ${reason}`,
    statusCode: 500,
    severity: 'warning',
    kind: 'cache_error',
    retryable: true,
    help: 'Clear the cache directory and try again: rm -rf .cycfix-cache',
    docs: 'https://docs.kitium.ai/errors/cycfix/cache',
    context: { operation, reason, ...context },
  });
}

/**
 * Analysis timeout error
 */
export function createAnalysisTimeoutError(
  operation: string,
  timeoutMs: number,
  context?: Record<string, unknown>
): KitiumError {
  return new KitiumError({
    code: 'cycfix/timeout',
    message: `Analysis operation exceeded timeout: ${operation} (${timeoutMs}ms)`,
    statusCode: 504,
    severity: 'warning',
    kind: 'timeout_error',
    retryable: true,
    help: 'Increase timeout limit or reduce the number of files to analyze with --max-files option',
    docs: 'https://docs.kitium.ai/errors/cycfix/timeout',
    context: { operation, timeoutMs, ...context },
  });
}

/**
 * Backward compatibility error classes
 * These are kept for gradual migration to KitiumError
 */

export class FileSystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserError';
  }
}

export class CycleDetectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CycleDetectionError';
  }
}

export class FixStrategyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FixStrategyError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIProviderError';
  }
}
