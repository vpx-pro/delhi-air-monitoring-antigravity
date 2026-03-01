type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export function log(level: LogLevel, source: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    ...meta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (source: string, msg: string, meta?: Record<string, unknown>) => log('info', source, msg, meta),
  warn: (source: string, msg: string, meta?: Record<string, unknown>) => log('warn', source, msg, meta),
  error: (source: string, msg: string, meta?: Record<string, unknown>) => log('error', source, msg, meta),
  debug: (source: string, msg: string, meta?: Record<string, unknown>) => log('debug', source, msg, meta),
};
