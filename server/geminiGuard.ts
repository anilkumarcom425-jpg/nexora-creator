import fs from 'fs';
import os from 'os';
import path from 'path';

export type ApiScope = 'text' | 'image';

export interface ClassifiedGeminiError {
  status: number;
  code: string;
  scope: ApiScope;
  retryable: boolean;
  isRateLimit: boolean;
  isQuotaExhausted: boolean;
  retryAfterSeconds?: number;
  message: string;
}

export interface ServerAiLogEntry {
  timestamp: string;
  requestId: string;
  module: string;
  scope: ApiScope;
  model: string;
  event:
    | 'queued'
    | 'success'
    | 'retry'
    | 'rate_limited'
    | 'quota_exhausted'
    | 'blocked_paid_api'
    | 'error';
  attempt: number;
  statusCode: number;
  errorCode?: string;
  retryAfterSeconds?: number;
  latencyMs?: number;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  message?: string;
}

export interface ScopeCounters {
  totalRequests: number;
  successCount: number;
  retryCount: number;
  rateLimit429Count: number;
  quotaExhaustedCount: number;
  otherErrorCount: number;
  totalTokensUsed: number;
  activeQueueDepth: number;
  inFlightCount: number;
  cooldownRemainingSeconds: number;
  lastErrorCode?: string;
  lastErrorAt?: string;
}

export class GuardedGeminiError extends Error {
  status: number;
  code: string;
  scope: ApiScope;
  module: string;
  retryAfterSeconds?: number;
  partialPartsCompleted?: number;

  constructor(opts: {
    message: string;
    status: number;
    code: string;
    scope: ApiScope;
    module: string;
    retryAfterSeconds?: number;
    partialPartsCompleted?: number;
  }) {
    super(opts.message);
    this.name = 'GuardedGeminiError';
    this.status = opts.status;
    this.code = opts.code;
    this.scope = opts.scope;
    this.module = opts.module;
    this.retryAfterSeconds = opts.retryAfterSeconds;
    this.partialPartsCompleted = opts.partialPartsCompleted;
  }
}

const SERVER_LOG_FILE = path.join(os.tmpdir(), 'nexora-ai-usage.log');

const recentServerLogs: ServerAiLogEntry[] = [];
const MAX_IN_MEMORY_LOGS = 200;

const scopeStats: Record<ApiScope, Omit<ScopeCounters, 'activeQueueDepth' | 'inFlightCount' | 'cooldownRemainingSeconds'>> = {
  text: {
    totalRequests: 0,
    successCount: 0,
    retryCount: 0,
    rateLimit429Count: 0,
    quotaExhaustedCount: 0,
    otherErrorCount: 0,
    totalTokensUsed: 0,
  },
  image: {
    totalRequests: 0,
    successCount: 0,
    retryCount: 0,
    rateLimit429Count: 0,
    quotaExhaustedCount: 0,
    otherErrorCount: 0,
    totalTokensUsed: 0,
  },
};

const moduleStats: Record<string, { requests: number; successes: number; errors: number; rateLimits: number }> = {};

export function logServerAiEvent(entry: ServerAiLogEntry): void {
  recentServerLogs.push(entry);
  if (recentServerLogs.length > MAX_IN_MEMORY_LOGS) {
    recentServerLogs.shift();
  }

  const bucket = scopeStats[entry.scope];
  if (entry.event === 'success') {
    bucket.successCount += 1;
    if (entry.totalTokens) {
      bucket.totalTokensUsed += entry.totalTokens;
    }
  } else if (entry.event === 'retry') {
    bucket.retryCount += 1;
  } else if (entry.event === 'rate_limited') {
    bucket.rateLimit429Count += 1;
    bucket.lastErrorCode = entry.errorCode;
    bucket.lastErrorAt = entry.timestamp;
  } else if (entry.event === 'quota_exhausted') {
    bucket.quotaExhaustedCount += 1;
    bucket.lastErrorCode = entry.errorCode;
    bucket.lastErrorAt = entry.timestamp;
  } else if (entry.event === 'error' || entry.event === 'blocked_paid_api') {
    bucket.otherErrorCount += 1;
    bucket.lastErrorCode = entry.errorCode;
    bucket.lastErrorAt = entry.timestamp;
  }

  if (!moduleStats[entry.module]) {
    moduleStats[entry.module] = { requests: 0, successes: 0, errors: 0, rateLimits: 0 };
  }
  const m = moduleStats[entry.module];
  if (entry.event === 'success') {
    m.requests += 1;
    m.successes += 1;
  } else if (entry.event === 'rate_limited' || entry.event === 'quota_exhausted') {
    m.requests += 1;
    m.rateLimits += 1;
    m.errors += 1;
  } else if (entry.event === 'error' || entry.event === 'blocked_paid_api') {
    m.requests += 1;
    m.errors += 1;
  }

  const line = JSON.stringify(entry);
  if (entry.event === 'quota_exhausted' || entry.event === 'error' || entry.event === 'blocked_paid_api') {
    console.error(`[NEXORA_AI_${entry.scope.toUpperCase()}_ERROR] ${line}`);
  } else if (entry.event === 'retry' || entry.event === 'rate_limited') {
    console.warn(`[NEXORA_AI_${entry.scope.toUpperCase()}_WARN] ${line}`);
  } else {
    console.info(`[NEXORA_AI_${entry.scope.toUpperCase()}] ${line}`);
  }

  fs.promises.appendFile(SERVER_LOG_FILE, `${line}\n`, 'utf8').catch(() => {
    // Never crash request flow on disk log errors
  });
}

function extractRetryAfterSeconds(err: unknown, rawText: string): number | undefined {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const headers = obj.headers as Record<string, unknown> | undefined;
    const retryHeader = headers?.['retry-after'] ?? headers?.['Retry-After'];
    if (retryHeader !== undefined) {
      const n = Number(retryHeader);
      if (Number.isFinite(n) && n > 0) return Math.ceil(n);
    }
    if (typeof obj.retryAfterSeconds === 'number' && obj.retryAfterSeconds > 0) {
      return Math.ceil(obj.retryAfterSeconds);
    }
  }

  const delayMatch =
    rawText.match(/retry(?:\s+in|\s*after|\s*delay)?["':\s]+(\d+(?:\.\d+)?)\s*s/i) ||
    rawText.match(/(\d+)\s*seconds?/i);
  if (delayMatch) {
    const val = Math.ceil(Number(delayMatch[1]));
    if (Number.isFinite(val) && val > 0 && val <= 3600) {
      return val;
    }
  }
  return undefined;
}

export function classifyGeminiError(
  err: unknown,
  scope: ApiScope = 'text',
  modelName = 'gemini-4-hydrogen'
): ClassifiedGeminiError {
  if (err instanceof GuardedGeminiError) {
    return {
      status: err.status,
      code: err.code,
      scope: err.scope,
      retryable: err.code === 'RATE_LIMIT_EXCEEDED' || err.code === 'UPSTREAM_UNAVAILABLE',
      isRateLimit: err.status === 429,
      isQuotaExhausted: err.code === 'QUOTA_EXHAUSTED',
      retryAfterSeconds: err.retryAfterSeconds,
      message: err.message,
    };
  }

  const errObj = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
  const nestedError = (
    errObj.error && typeof errObj.error === 'object' ? errObj.error : {}
  ) as Record<string, unknown>;
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(errObj);
  const lower = `${raw} ${String(errObj.status ?? '')} ${String(nestedError.status ?? '')} ${String(
    nestedError.message ?? ''
  )}`.toLowerCase();

  const numericStatus = Number(errObj.status ?? errObj.statusCode ?? nestedError.code ?? 0);
  const statusStr = String(errObj.status ?? nestedError.status ?? '').toUpperCase();

  if (errObj.code === 'INVALID_AI_OUTPUT' || lower.includes('invalid_ai_output')) {
    return {
      status: 502,
      code: 'INVALID_AI_OUTPUT',
      scope,
      retryable: true,
      isRateLimit: false,
      isQuotaExhausted: false,
      message: 'Gemini returned an incomplete or invalid response. Please try again.',
    };
  }

  if (errObj.code === 'PAID_API_NOT_ENABLED') {
    return {
      status: 403,
      code: 'PAID_API_NOT_ENABLED',
      scope,
      retryable: false,
      isRateLimit: false,
      isQuotaExhausted: false,
      message:
        'Paid image generation APIs and billing are disabled unless explicitly authorized by the user.',
    };
  }

  const is429 =
    numericStatus === 429 ||
    lower.includes('429') ||
    lower.includes('too many requests') ||
    lower.includes('rate limit') ||
    lower.includes('ratelimit');

  const isResourceExhausted =
    statusStr === 'RESOURCE_EXHAUSTED' || lower.includes('resource_exhausted');

  if (is429 || isResourceExhausted) {
    const retryAfterSeconds = extractRetryAfterSeconds(err, raw);
    const hardQuotaSignals =
      lower.includes('exceeded your current quota') ||
      lower.includes('quota exceeded') ||
      lower.includes('daily limit') ||
      lower.includes('requests per day') ||
      lower.includes('generate_content_free_tier') ||
      lower.includes('limit: 0') ||
      lower.includes('exhausted') && lower.includes('quota');

    if (hardQuotaSignals || (isResourceExhausted && !lower.includes('per minute') && !lower.includes('rpm'))) {
      return {
        status: 429,
        code: 'QUOTA_EXHAUSTED',
        scope,
        retryable: false,
        isRateLimit: true,
        isQuotaExhausted: true,
        retryAfterSeconds: retryAfterSeconds ?? 60,
        message: `Gemini ${scope} generation quota is currently exhausted (429 RESOURCE_EXHAUSTED). Please wait until quota becomes available again.`,
      };
    }

    return {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      scope,
      retryable: true,
      isRateLimit: true,
      isQuotaExhausted: false,
      retryAfterSeconds: retryAfterSeconds ?? 15,
      message: `Gemini ${scope} generation rate limit reached (HTTP 429). Please wait ${retryAfterSeconds ?? 15} seconds before retrying.`,
    };
  }

  if (
    numericStatus === 403 ||
    numericStatus === 401 ||
    statusStr === 'PERMISSION_DENIED' ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied')
  ) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      scope,
      retryable: false,
      isRateLimit: false,
      isQuotaExhausted: false,
      message:
        'Server Gemini API key is missing, invalid, or lacks permission. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }

  if (numericStatus === 404 || statusStr === 'NOT_FOUND' || lower.includes('not_found')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      scope,
      retryable: false,
      isRateLimit: false,
      isQuotaExhausted: false,
      message: `Requested AI model (${modelName}) was not found or is unavailable right now.`,
    };
  }

  if (
    numericStatus === 503 ||
    numericStatus === 504 ||
    lower.includes('timeout') ||
    lower.includes('econnreset') ||
    lower.includes('fetch failed') ||
    lower.includes('unavailable')
  ) {
    return {
      status: 503,
      code: 'UPSTREAM_UNAVAILABLE',
      scope,
      retryable: true,
      isRateLimit: false,
      isQuotaExhausted: false,
      retryAfterSeconds: 5,
      message: 'Gemini AI service is temporarily unavailable. Please retry in a few seconds.',
    };
  }

  return {
    status: 500,
    code: 'GENERATION_FAILED',
    scope,
    retryable: false,
    isRateLimit: false,
    isQuotaExhausted: false,
    message: raw || 'An unexpected error occurred while generating content.',
  };
}

interface QueuedTask<T> {
  module: string;
  requestId: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
}

export interface LaneLimiterConfig {
  scope: ApiScope;
  maxConcurrent: number;
  minSpacingMs: number;
  maxRequestsPerMinute: number;
  maxQueueSize: number;
}

export class GeminiLaneLimiter {
  readonly scope: ApiScope;
  private readonly maxConcurrent: number;
  private readonly minSpacingMs: number;
  private readonly maxRequestsPerMinute: number;
  private readonly maxQueueSize: number;

  private queue: Array<QueuedTask<unknown>> = [];
  private inFlight = 0;
  private lastDispatchAt = 0;
  private minuteTimestamps: number[] = [];
  private cooldownUntil = 0;
  private cooldownCode: 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXHAUSTED' = 'RATE_LIMIT_EXCEEDED';
  private pumpTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: LaneLimiterConfig) {
    this.scope = config.scope;
    this.maxConcurrent = config.maxConcurrent;
    this.minSpacingMs = config.minSpacingMs;
    this.maxRequestsPerMinute = config.maxRequestsPerMinute;
    this.maxQueueSize = config.maxQueueSize;
  }

  getCooldownRemainingSeconds(): number {
    const diff = this.cooldownUntil - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  }

  getSnapshot() {
    this.pruneMinuteWindow(Date.now());
    return {
      scope: this.scope,
      queueDepth: this.queue.length,
      inFlight: this.inFlight,
      requestsLastMinute: this.minuteTimestamps.length,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      cooldownRemainingSeconds: this.getCooldownRemainingSeconds(),
      cooldownCode: this.getCooldownRemainingSeconds() > 0 ? this.cooldownCode : null,
    };
  }

  tripCooldown(seconds: number, code: 'RATE_LIMIT_EXCEEDED' | 'QUOTA_EXHAUSTED'): void {
    const safeSeconds = Math.max(1, Math.min(seconds, 300));
    const targetUntil = Date.now() + safeSeconds * 1000;
    if (targetUntil > this.cooldownUntil || code === 'QUOTA_EXHAUSTED') {
      this.cooldownUntil = Math.max(this.cooldownUntil, targetUntil);
      this.cooldownCode = code;
    }
  }

  resetForTesting(): void {
    this.queue = [];
    this.inFlight = 0;
    this.lastDispatchAt = 0;
    this.minuteTimestamps = [];
    this.cooldownUntil = 0;
    this.cooldownCode = 'RATE_LIMIT_EXCEEDED';
    if (this.pumpTimer) {
      clearTimeout(this.pumpTimer);
      this.pumpTimer = null;
    }
  }

  private pruneMinuteWindow(now: number): void {
    const cutoff = now - 60000;
    while (this.minuteTimestamps.length > 0 && this.minuteTimestamps[0] <= cutoff) {
      this.minuteTimestamps.shift();
    }
  }

  schedule<T>(module: string, requestId: string, execute: () => Promise<T>): Promise<T> {
    const cooldownRem = this.getCooldownRemainingSeconds();
    if (cooldownRem > 0) {
      const code = this.cooldownCode;
      const err = new GuardedGeminiError({
        status: 429,
        code,
        scope: this.scope,
        module,
        retryAfterSeconds: cooldownRem,
        message:
          code === 'QUOTA_EXHAUSTED'
            ? `Gemini ${this.scope} quota is exhausted. Please wait ${cooldownRem} seconds until quota becomes available.`
            : `Gemini ${this.scope} rate limit cooldown active. Please wait ${cooldownRem} seconds.`,
      });
      logServerAiEvent({
        timestamp: new Date().toISOString(),
        requestId,
        module,
        scope: this.scope,
        model: 'lane-guard',
        event: code === 'QUOTA_EXHAUSTED' ? 'quota_exhausted' : 'rate_limited',
        attempt: 0,
        statusCode: 429,
        errorCode: code,
        retryAfterSeconds: cooldownRem,
        message: err.message,
      });
      return Promise.reject(err);
    }

    if (this.queue.length >= this.maxQueueSize) {
      const err = new GuardedGeminiError({
        status: 429,
        code: 'QUEUE_OVERLOADED',
        scope: this.scope,
        module,
        retryAfterSeconds: 5,
        message: `Too many ${this.scope} requests queued right now. Please wait 5 seconds and try again.`,
      });
      logServerAiEvent({
        timestamp: new Date().toISOString(),
        requestId,
        module,
        scope: this.scope,
        model: 'lane-guard',
        event: 'rate_limited',
        attempt: 0,
        statusCode: 429,
        errorCode: 'QUEUE_OVERLOADED',
        retryAfterSeconds: 5,
        message: err.message,
      });
      return Promise.reject(err);
    }

    // Immediate RPM limit check if wait would exceed 10 seconds
    const now = Date.now();
    this.pruneMinuteWindow(now);
    if (this.minuteTimestamps.length >= this.maxRequestsPerMinute) {
      const oldest = this.minuteTimestamps[0];
      const waitMs = oldest + 60000 - now;
      if (waitMs > 10000) {
        const waitSec = Math.max(1, Math.ceil(waitMs / 1000));
        const err = new GuardedGeminiError({
          status: 429,
          code: 'LOCAL_RATE_LIMIT',
          scope: this.scope,
          module,
          retryAfterSeconds: waitSec,
          message: `${this.scope} generation rate limit reached (${this.maxRequestsPerMinute}/min). Please wait ${waitSec} seconds.`,
        });
        logServerAiEvent({
          timestamp: new Date().toISOString(),
          requestId,
          module,
          scope: this.scope,
          model: 'lane-guard',
          event: 'rate_limited',
          attempt: 0,
          statusCode: 429,
          errorCode: 'LOCAL_RATE_LIMIT',
          retryAfterSeconds: waitSec,
          message: err.message,
        });
        return Promise.reject(err);
      }
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        module,
        requestId,
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      if (this.queue.length > 1 || this.inFlight > 0) {
        logServerAiEvent({
          timestamp: new Date().toISOString(),
          requestId,
          module,
          scope: this.scope,
          model: 'lane-guard',
          event: 'queued',
          attempt: 0,
          statusCode: 202,
          message: `Queued in ${this.scope} lane (position ${this.queue.length})`,
        });
      }
      this.pump();
    });
  }

  private schedulePump(delayMs: number): void {
    if (this.pumpTimer) return;
    this.pumpTimer = setTimeout(() => {
      this.pumpTimer = null;
      this.pump();
    }, Math.max(20, delayMs));
  }

  private pump(): void {
    while (this.queue.length > 0 && this.inFlight < this.maxConcurrent) {
      const now = Date.now();
      if (now < this.cooldownUntil) {
        // Fail queued items cleanly when cooldown trips
        const rem = this.getCooldownRemainingSeconds();
        const item = this.queue.shift()!;
        item.reject(
          new GuardedGeminiError({
            status: 429,
            code: this.cooldownCode,
            scope: this.scope,
            module: item.module,
            retryAfterSeconds: rem,
            message: `Gemini ${this.scope} limit active. Please wait ${rem} seconds.`,
          })
        );
        continue;
      }

      this.pruneMinuteWindow(now);
      if (this.minuteTimestamps.length >= this.maxRequestsPerMinute) {
        const waitMs = this.minuteTimestamps[0] + 60000 - now;
        this.schedulePump(waitMs);
        return;
      }

      const elapsedSinceLast = now - this.lastDispatchAt;
      if (elapsedSinceLast < this.minSpacingMs) {
        this.schedulePump(this.minSpacingMs - elapsedSinceLast);
        return;
      }

      const task = this.queue.shift()!;
      this.inFlight += 1;
      this.lastDispatchAt = now;
      this.minuteTimestamps.push(now);

      Promise.resolve()
        .then(() => task.execute())
        .then(
          (val) => {
            this.inFlight = Math.max(0, this.inFlight - 1);
            task.resolve(val);
            this.pump();
          },
          (err) => {
            this.inFlight = Math.max(0, this.inFlight - 1);
            task.reject(err);
            this.pump();
          }
        );
    }
  }
}

// Completely independent rate limits & queues for Text vs Image generation
export const textLaneLimiter = new GeminiLaneLimiter({
  scope: 'text',
  maxConcurrent: 2,
  minSpacingMs: 300,
  maxRequestsPerMinute: 20,
  maxQueueSize: 12,
});

export const imageLaneLimiter = new GeminiLaneLimiter({
  scope: 'image',
  maxConcurrent: 1,
  minSpacingMs: 1200,
  maxRequestsPerMinute: 6,
  maxQueueSize: 6,
});

export function getLaneLimiter(scope: ApiScope): GeminiLaneLimiter {
  return scope === 'image' ? imageLaneLimiter : textLaneLimiter;
}

export function resolveApiScope(mode: string, payload?: Record<string, unknown>): ApiScope {
  if (mode === 'image' || payload?.apiScope === 'image' || payload?.generationType === 'image') {
    return 'image';
  }
  return 'text';
}

export function getServerUsageSnapshot() {
  const textSnap = textLaneLimiter.getSnapshot();
  const imageSnap = imageLaneLimiter.getSnapshot();
  return {
    text: {
      ...scopeStats.text,
      activeQueueDepth: textSnap.queueDepth,
      inFlightCount: textSnap.inFlight,
      cooldownRemainingSeconds: textSnap.cooldownRemainingSeconds,
      requestsLastMinute: textSnap.requestsLastMinute,
      maxRequestsPerMinute: textSnap.maxRequestsPerMinute,
    },
    image: {
      ...scopeStats.image,
      activeQueueDepth: imageSnap.queueDepth,
      inFlightCount: imageSnap.inFlight,
      cooldownRemainingSeconds: imageSnap.cooldownRemainingSeconds,
      requestsLastMinute: imageSnap.requestsLastMinute,
      maxRequestsPerMinute: imageSnap.maxRequestsPerMinute,
    },
    modules: { ...moduleStats },
    recentLogCount: recentServerLogs.length,
  };
}

export interface GuardedCallOptions {
  module: string;
  scope: ApiScope;
  model: string;
  requestId: string;
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function executeGuardedGeminiCall<T extends { usageMetadata?: unknown } | unknown>(
  options: GuardedCallOptions,
  callFn: () => Promise<T>
): Promise<T> {
  const {
    module,
    scope,
    model,
    requestId,
    maxRetries = 2,
    baseBackoffMs = 1000,
    maxBackoffMs = 8000,
    sleepFn = defaultSleep,
  } = options;

  const lane = getLaneLimiter(scope);
  scopeStats[scope].totalRequests += 1;

  return lane.schedule(module, requestId, async () => {
    const startTime = Date.now();
    let lastClassified: ClassifiedGeminiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await callFn();
        const latencyMs = Date.now() - startTime;
        const usage =
          result && typeof result === 'object'
            ? ((result as Record<string, unknown>).usageMetadata as Record<string, number> | undefined)
            : undefined;

        logServerAiEvent({
          timestamp: new Date().toISOString(),
          requestId,
          module,
          scope,
          model,
          event: 'success',
          attempt: attempt + 1,
          statusCode: 200,
          latencyMs,
          promptTokens: usage?.promptTokenCount,
          outputTokens: usage?.candidatesTokenCount,
          totalTokens: usage?.totalTokenCount,
        });
        return result;
      } catch (err) {
        const classified = classifyGeminiError(err, scope, model);
        lastClassified = classified;

        const isLastAttempt = attempt >= maxRetries;
        if (!classified.retryable || isLastAttempt) {
          if (classified.isQuotaExhausted) {
            lane.tripCooldown(classified.retryAfterSeconds ?? 60, 'QUOTA_EXHAUSTED');
          } else if (classified.isRateLimit) {
            lane.tripCooldown(classified.retryAfterSeconds ?? 15, 'RATE_LIMIT_EXCEEDED');
          }

          logServerAiEvent({
            timestamp: new Date().toISOString(),
            requestId,
            module,
            scope,
            model,
            event: classified.isQuotaExhausted
              ? 'quota_exhausted'
              : classified.isRateLimit
              ? 'rate_limited'
              : classified.code === 'PAID_API_NOT_ENABLED'
              ? 'blocked_paid_api'
              : 'error',
            attempt: attempt + 1,
            statusCode: classified.status,
            errorCode: classified.code,
            retryAfterSeconds: classified.retryAfterSeconds,
            latencyMs: Date.now() - startTime,
            message: classified.message,
          });

          throw new GuardedGeminiError({
            message: classified.message,
            status: classified.status,
            code: classified.code,
            scope,
            module,
            retryAfterSeconds: classified.retryAfterSeconds,
          });
        }

        // Bounded exponential backoff + proportional jitter
        const expDelay = Math.min(maxBackoffMs, baseBackoffMs * Math.pow(2, attempt));
        const jitter = Math.floor(Math.random() * Math.max(20, Math.min(400, expDelay * 0.25)));
        const delayMs = expDelay + jitter;

        logServerAiEvent({
          timestamp: new Date().toISOString(),
          requestId,
          module,
          scope,
          model,
          event: 'retry',
          attempt: attempt + 1,
          statusCode: classified.status,
          errorCode: classified.code,
          retryAfterSeconds: Math.ceil(delayMs / 1000),
          latencyMs: Date.now() - startTime,
          message: `Transient ${classified.code}; retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        });

        await sleepFn(delayMs);
      }
    }

    throw new GuardedGeminiError({
      message: lastClassified?.message || 'Gemini generation failed after retries.',
      status: lastClassified?.status || 500,
      code: lastClassified?.code || 'GENERATION_FAILED',
      scope,
      module,
      retryAfterSeconds: lastClassified?.retryAfterSeconds,
    });
  });
}
