import { env } from "@/config/env";

export type ClientLogLevel = "debug" | "info" | "warn" | "error";

export type LogArea = "app" | "auth" | "health" | "organisation" | "error";

export interface StructuredLog {
  area: LogArea;
  /** Dot-separated event name, e.g. auth.session.checked */
  event: string;
  /** Human-readable description shown in Seq. */
  message: string;
  context?: Record<string, unknown>;
}

export interface ClientLogEntry {
  level: ClientLogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp?: string;
  url?: string;
  userAgent?: string;
}

interface LoggerUserContext {
  userId?: string;
  username?: string;
}

const FLUSH_INTERVAL_MS = 750;
const MAX_BATCH_SIZE = 20;

let userContext: LoggerUserContext = {};
const queue: ClientLogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function setLoggerUserContext(context: LoggerUserContext): void {
  userContext = context;
}

function formatMessage(area: LogArea, message: string): string {
  return `[UI][${area}] ${message}`;
}

function mirrorToConsole(entry: ClientLogEntry): void {
  const consoleMethod =
    entry.level === "debug" ? console.debug : console[entry.level];

  consoleMethod(entry.message, entry.context ?? {});
}

function buildEntry(
  level: ClientLogLevel,
  payload: StructuredLog,
): ClientLogEntry {
  const { area, event, message, context } = payload;

  return {
    level,
    message: formatMessage(area, message),
    context: {
      origin: "ui",
      area,
      event,
      ...context,
      ...(userContext.userId ? { userId: userContext.userId } : {}),
      ...(userContext.username ? { username: userContext.username } : {}),
    },
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}

function enqueue(entry: ClientLogEntry): void {
  if (!env.clientLoggingEnabled) {
    mirrorToConsole(entry);
    return;
  }

  mirrorToConsole(entry);
  queue.push(entry);

  if (queue.length >= MAX_BATCH_SIZE) {
    void flushClientLogs();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      void flushClientLogs();
    }, FLUSH_INTERVAL_MS);
  }
}

async function sendLogs(logs: ClientLogEntry[], useBeacon: boolean): Promise<void> {
  const payload = JSON.stringify({ logs });
  const endpoint = `${env.apiBaseUrl}/logs/client`;

  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  });
}

export async function flushClientLogs(useBeacon = false): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (queue.length === 0) {
    return;
  }

  const batch = queue.splice(0, MAX_BATCH_SIZE);

  try {
    await sendLogs(batch, useBeacon);
  } catch {
    queue.unshift(...batch);
  }
}

function logStructured(level: ClientLogLevel, payload: StructuredLog): void {
  enqueue(buildEntry(level, payload));
}

export const clientLogger = {
  debug: (payload: StructuredLog) => logStructured("debug", payload),
  info: (payload: StructuredLog) => logStructured("info", payload),
  warn: (payload: StructuredLog) => logStructured("warn", payload),
  error: (payload: StructuredLog) => logStructured("error", payload),
};

export function initClientLogging(): void {
  if (!env.clientLoggingEnabled) {
    return;
  }

  clientLogger.info({
    area: "app",
    event: "logging.initialized",
    message: "Frontend logging connected to API",
  });

  window.addEventListener("error", (event) => {
    clientLogger.error({
      area: "error",
      event: "browser.unhandled_error",
      message: event.message || "Unhandled browser error",
      context: {
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    clientLogger.error({
      area: "error",
      event: "browser.unhandled_rejection",
      message: "Unhandled promise rejection",
      context: {
        reason:
          event.reason instanceof Error
            ? event.reason.message
            : String(event.reason),
      },
    });
  });

  window.addEventListener("pagehide", () => {
    void flushClientLogs(true);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushClientLogs(true);
    }
  });
}
