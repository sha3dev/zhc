type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const supportsColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';
const RESET = supportsColor ? '\u001B[0m' : '';
const DIM = supportsColor ? '\u001B[2m' : '';
const BOLD = supportsColor ? '\u001B[1m' : '';
const FG_RED = supportsColor ? '\u001B[31m' : '';
const FG_YELLOW = supportsColor ? '\u001B[33m' : '';
const FG_GREEN = supportsColor ? '\u001B[32m' : '';
const FG_CYAN = supportsColor ? '\u001B[36m' : '';
const FG_MAGENTA = supportsColor ? '\u001B[35m' : '';
const FG_GRAY = supportsColor ? '\u001B[90m' : '';

const CONTEXT_PREVIEW_LIMIT = 240;
const MULTILINE_PREVIEW_LIMIT = 1200;

function colorize(color: string, value: string): string {
  return `${color}${value}${RESET}`;
}

function levelLabel(level: LogLevel): string {
  switch (level) {
    case 'error':
      return colorize(FG_RED, 'ERR');
    case 'warn':
      return colorize(FG_YELLOW, 'WRN');
    default:
      return colorize(FG_GREEN, 'INF');
  }
}

function formatScalar(value: unknown): string {
  if (value === null) {
    return colorize(FG_GRAY, 'null');
  }

  if (value === undefined) {
    return colorize(FG_GRAY, 'undefined');
  }

  if (typeof value === 'string') {
    const singleLine = value.replace(/\s+/g, ' ').trim();
    if (singleLine.length <= CONTEXT_PREVIEW_LIMIT) {
      return singleLine;
    }
    return `${singleLine.slice(0, CONTEXT_PREVIEW_LIMIT - 1)}…`;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  try {
    const serialized = JSON.stringify(value);
    if (!serialized) {
      return String(value);
    }
    if (serialized.length <= CONTEXT_PREVIEW_LIMIT) {
      return serialized;
    }
    return `${serialized.slice(0, CONTEXT_PREVIEW_LIMIT - 1)}…`;
  } catch {
    return String(value);
  }
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return '';
  }

  const pairs = Object.entries(context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${colorize(FG_CYAN, key)}=${formatScalar(value)}`);

  return pairs.length > 0 ? ` ${pairs.join(' ')}` : '';
}

function formatLine(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = colorize(FG_GRAY, new Date().toISOString());
  const label = levelLabel(level);
  const formattedMessage = `${BOLD}${message}${RESET}`;
  return `${timestamp} ${label} ${formattedMessage}${formatContext(context)}`;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const line = formatLine(level, message, context);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}

function normalizeMultiline(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.length > MULTILINE_PREVIEW_LIMIT
    ? `${trimmed.slice(0, MULTILINE_PREVIEW_LIMIT - 1)}…`
    : trimmed;
}

function writeBlock(title: string, content: string, color: string): void {
  const normalized = normalizeMultiline(content);
  if (!normalized) {
    return;
  }

  const header = `${colorize(color, title)}${RESET}`;
  const body = normalized
    .split('\n')
    .map((line) => `${DIM}│${RESET} ${line}`)
    .join('\n');

  console.info(`${header}\n${body}`);
}

export const logger = {
  cli(title: string, content: string): void {
    writeBlock(title, content, FG_MAGENTA);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
  info(message: string, context?: LogContext): void {
    write('info', message, context);
  },
  warn(message: string, context?: LogContext): void {
    write('warn', message, context);
  },
};
