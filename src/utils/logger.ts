import chalk from 'chalk';
import dayjs from 'dayjs';
import { fetchCachedConfig } from './config.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export function getLogLevelFromString(loggingLevel: string): LogLevel {
  switch (loggingLevel.toUpperCase()) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
  }

  return LogLevel.INFO;
}

export class Logger {
  private readonly prefix: string;
  private configuredLogLevel: LogLevel;

  constructor(prefix: string) {
    this.prefix = prefix;
    const config = fetchCachedConfig();
    this.configuredLogLevel = config?.logLevel ?? LogLevel.INFO;
  }

  public debug(message: string, context?: object): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: object): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: object): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, context?: object): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(level: LogLevel, message: string, context?: object): void {
    if (level < this.configuredLogLevel) {
      return;
    }

    const timestamp = dayjs().toISOString();
    const levelString = LogLevel[level];

    let levelColored: string;

    switch (level) {
      case LogLevel.DEBUG:
        levelColored = chalk.gray(`[${levelString}]`);
        break;
      case LogLevel.INFO:
        levelColored = chalk.cyan(`[${levelString}]`);
        break;
      case LogLevel.WARN:
        levelColored = chalk.yellow(`[${levelString}]`);
        break;
      case LogLevel.ERROR:
        levelColored = chalk.red(`[${levelString}]`);
        break;
      default:
        levelColored = `[${levelString}]`;
        break;
    }

    const timestampColored = chalk.magenta(timestamp);
    const prefixColored = chalk.hex('#FF8C00')(`(${this.prefix})`);

    const mainOutput = `${levelColored} ${timestampColored} ${prefixColored} ${message}`;

    if (context instanceof Error) {
      switch (level) {
        case LogLevel.ERROR: console.error(mainOutput, context); break;
        case LogLevel.WARN: console.warn(mainOutput, context); break;
        default: console.log(mainOutput, context); break;
      }
      return;
    }

    const contextString = context ? `\n${JSON.stringify(context, null, 2)}` : '';
    const fullOutput = `${mainOutput}${contextString}`;

    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(fullOutput);
        break;
      case LogLevel.WARN:
        console.warn(fullOutput);
        break;
      case LogLevel.ERROR:
        console.error(fullOutput);
        break;
    }
  }
}

/**
 * Factory function to create a new Logger instance.
 * @param prefix A string to prepend to all messages from this logger instance.
 * @returns A new Logger instance.
 */
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}
