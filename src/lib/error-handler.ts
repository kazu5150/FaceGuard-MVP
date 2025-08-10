export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
  ip?: string;
  userAgent?: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(): number {
    const duration = performance.now() - this.startTime;
    log({
      level: LogLevel.DEBUG,
      message: `Performance: ${this.operation}`,
      timestamp: new Date(),
      context: { duration: `${duration.toFixed(2)}ms` }
    });
    return duration;
  }
}

export function log(entry: LogEntry): void {
  const logData = {
    timestamp: entry.timestamp.toISOString(),
    level: entry.level,
    message: entry.message,
    ...(entry.context && { context: entry.context }),
    ...(entry.error && { 
      error: {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack
      }
    }),
    ...(entry.ip && { ip: entry.ip }),
    ...(entry.userAgent && { userAgent: entry.userAgent })
  };

  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(JSON.stringify(logData));
      break;
    case LogLevel.INFO:
      console.info(JSON.stringify(logData));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(logData));
      break;
    case LogLevel.ERROR:
      console.error(JSON.stringify(logData));
      break;
  }
}

export function createValidationError(message: string, field?: string): AppError {
  return new AppError(
    message,
    'VALIDATION_ERROR',
    400,
    { field }
  );
}

export function createNotFoundError(resource: string, id: string): AppError {
  return new AppError(
    `${resource} (${id}) が見つかりません`,
    'NOT_FOUND',
    404,
    { resource, id }
  );
}

export function createRateLimitError(resetTime?: number): AppError {
  return new AppError(
    'リクエストが多すぎます。しばらく待ってから再試行してください',
    'RATE_LIMIT_EXCEEDED',
    429,
    { resetTime }
  );
}

export function withErrorHandler<T extends (...args: any[]) => any>(
  fn: T
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          log({
            level: LogLevel.ERROR,
            message: 'Unhandled promise rejection',
            timestamp: new Date(),
            error
          });
          throw error;
        });
      }
      return result;
    } catch (error) {
      log({
        level: LogLevel.ERROR,
        message: 'Unhandled error',
        timestamp: new Date(),
        error: error as Error
      });
      throw error;
    }
  }) as T;
}