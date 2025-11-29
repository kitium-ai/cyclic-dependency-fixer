import path from 'path';
import {
  getLogger,
  initializeLogger,
  LogLevel,
  type ILogger,
  type LoggerConfig,
  type LokiConfig,
} from '@kitiumai/logger';

type DeploymentEnvironment = 'development' | 'staging' | 'production';

let initialized = false;

function resolveEnvironment(value?: string): DeploymentEnvironment {
  switch (value) {
    case 'production':
    case 'staging':
      return value;
    case undefined:
    default:
      return 'development';
  }
}

function resolveLogLevel(value?: string): LogLevel {
  switch (value?.toLowerCase()) {
    case 'debug':
      return LogLevel.DEBUG;
    case 'warn':
      return LogLevel.WARN;
    case 'error':
    case 'fatal':
      return LogLevel.ERROR;
    case undefined:
    default:
      return LogLevel.INFO;
  }
}

function buildLokiConfig(environment: DeploymentEnvironment): LokiConfig {
  const isLokiEnabled = process.env['CYCFIX_LOKI_ENABLED'] === 'true';
  const basicAuth =
    process.env['CYCFIX_LOKI_USERNAME'] && process.env['CYCFIX_LOKI_PASSWORD']
      ? {
          username: process.env['CYCFIX_LOKI_USERNAME'],
          password: process.env['CYCFIX_LOKI_PASSWORD'],
        }
      : undefined;

  return {
    enabled: isLokiEnabled,
    host: process.env['CYCFIX_LOKI_HOST'] ?? 'localhost',
    port: Number.parseInt(process.env['CYCFIX_LOKI_PORT'] ?? '3100', 10),
    protocol: (process.env['CYCFIX_LOKI_PROTOCOL'] ?? 'http') as 'http' | 'https',
    labels: {
      service: process.env['CYCFIX_SERVICE_NAME'] ?? 'cyclic-dependency-fixer',
      environment,
    },
    ...(basicAuth && { basicAuth }),
    batchSize: Number.parseInt(process.env['CYCFIX_LOKI_BATCH_SIZE'] ?? '250', 10),
    interval: Number.parseInt(process.env['CYCFIX_LOKI_INTERVAL'] ?? '5000', 10),
    timeout: Number.parseInt(process.env['CYCFIX_LOKI_TIMEOUT'] ?? '15000', 10),
  };
}

function createLoggerConfig(): LoggerConfig {
  const environment = resolveEnvironment(process.env['NODE_ENV']);
  const logLevel = resolveLogLevel(process.env['CYCFIX_LOG_LEVEL']);
  const logDir = process.env['CYCFIX_LOG_DIR'] ?? path.resolve(process.cwd(), 'logs');

  return {
    serviceName: process.env['CYCFIX_SERVICE_NAME'] ?? 'cyclic-dependency-fixer',
    environment,
    logLevel,
    loki: buildLokiConfig(environment),
    enableConsoleTransport: process.env['CYCFIX_LOG_CONSOLE'] !== 'false',
    enableFileTransport: process.env['CYCFIX_LOG_FILE'] === 'true',
    fileLogPath: logDir,
    maxFileSize: process.env['CYCFIX_LOG_MAX_FILE_SIZE'] ?? '25m',
    maxFiles: Number.parseInt(process.env['CYCFIX_LOG_MAX_FILES'] ?? '5', 10),
    includeTimestamp: process.env['CYCFIX_LOG_TIMESTAMP'] !== 'false',
    includeMeta: process.env['CYCFIX_LOG_META'] !== 'false',
  };
}

function ensureLoggerInitialized(): void {
  if (!initialized) {
    initializeLogger(createLoggerConfig());
    initialized = true;
  }
}

export function getCycfixLogger(scope?: string): ILogger {
  ensureLoggerInitialized();
  const logger = getLogger();
  return scope ? logger.child({ scope }) : logger;
}
