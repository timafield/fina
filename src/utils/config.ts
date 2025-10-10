import { LogLevel } from './logger';

export function getConfiguredLogLevel(): LogLevel {
  // TODO: check command line args

  const logLevelEnv = process.env.LOG_LEVEL?.toUpperCase();
  switch (logLevelEnv) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
      return LogLevel.SILENT;
  }

  // TODO: check config file value

  return LogLevel.INFO;
}