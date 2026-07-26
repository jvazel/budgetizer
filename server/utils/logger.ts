import { AsyncLocalStorage } from 'node:async_hooks';

const isProduction = process.env.NODE_ENV === 'production';

export const requestStore = new AsyncLocalStorage<{ requestId: string }>();

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

const serializeMeta = (meta?: Record<string, unknown>): Record<string, unknown> | undefined => {
  if (!meta) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      result[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    } else {
      result[key] = value;
    }
  }
  return result;
};

class StructuredLogger {
  private context: Record<string, unknown>;

  constructor(context?: Record<string, unknown>) {
    this.context = context ? serializeMeta(context) || {} : {};
  }

  private format(level: string, message: string, meta?: Record<string, unknown>): LogEntry {
    const serializedMeta = serializeMeta(meta);
    const store = requestStore.getStore();
    const requestId = store?.requestId;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(requestId ? { requestId } : {}),
      context: { ...this.context, ...serializedMeta },
    };
  }

  info(message: string, meta?: Record<string, unknown>): void {
    const entry = this.format('INFO', message, meta);
    console.log(JSON.stringify(entry));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    const entry = this.format('WARN', message, meta);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    const entry = this.format('ERROR', message, meta);
    console.error(JSON.stringify(entry));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (isProduction) return;
    const entry = this.format('DEBUG', message, meta);
    console.log(JSON.stringify(entry));
  }

  child(childContext: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({ ...this.context, ...childContext });
  }
}

export const logger = new StructuredLogger();
export default StructuredLogger;