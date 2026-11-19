import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

export interface ProgressUpdate {
  sessionId: string;
  step: string;
  percentage: number;
  message: string;
  timestamp: Date;
  estimatedTimeRemaining?: number;
  error?: string;
}

export type OnboardingJobClaim =
  | { claimed: true }
  | { claimed: false; sessionId: string };

const TERMINAL_STEPS = new Set(['complete', 'error']);

// Deletes the job key only when it still holds this session's id.
const RELEASE_JOB_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

export class ProgressService {
  private redis: Redis;
  private readonly PROGRESS_KEY_PREFIX = 'onboarding:progress:';
  private readonly PROGRESS_TTL = 600; // 10 minutes
  private readonly OWNER_KEY_PREFIX = 'onboarding:owner:';
  private readonly OWNER_TTL = 3600; // covers a full analysis run
  private readonly JOB_KEY_PREFIX = 'onboarding:job:';
  private readonly JOB_TTL = 1800; // released when the job ends; TTL covers a crash
  private redisOperational = true;

  constructor() {
    this.redis = this.createRedisClient();
    this.redis.on('error', (error) => {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed. Progress streaming is disabled.',
        );
        return;
      }

      if (this.redisOperational) {
        console.warn(
          '[ProgressService] Redis error:',
          error instanceof Error ? error.message : String(error),
        );
      }
    });
  }

  private createRedisClient(): Redis {
    const redisUrl = process.env.REDIS_URL;
    const redisDb = parseInt(process.env.REDIS_DB ?? '0');
    const options: RedisOptions = {
      db: Number.isNaN(redisDb) ? 0 : redisDb,
      enableReadyCheck: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    };

    if (redisUrl) {
      return new Redis(redisUrl, options);
    }

    const redisPort = parseInt(process.env.REDIS_PORT ?? '6379');
    return new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number.isNaN(redisPort) ? 6379 : redisPort,
      ...(process.env.REDIS_PASSWORD
        ? { password: process.env.REDIS_PASSWORD }
        : {}),
      ...(process.env.REDIS_USERNAME
        ? { username: process.env.REDIS_USERNAME }
        : {}),
      ...options,
    });
  }

  private getKey(sessionId: string): string {
    return `${this.PROGRESS_KEY_PREFIX}${sessionId}`;
  }

  async setProgress(
    sessionId: string,
    step: string,
    percentage: number,
    message: string,
    estimatedTimeRemaining?: number,
    error?: string,
  ): Promise<void> {
    const progress: ProgressUpdate = {
      sessionId,
      step,
      percentage: Math.min(100, Math.max(0, percentage)),
      message,
      timestamp: new Date(),
      estimatedTimeRemaining,
      error,
    };

    console.log('[ProgressService] Setting progress:', {
      sessionId: sessionId.substring(0, 8) + '...',
      step,
      percentage,
      message,
      estimatedTimeRemaining,
      hasError: !!error,
      timestamp: progress.timestamp.toISOString()
    });

    if (!this.redisOperational) {
      return;
    }

    const key = this.getKey(sessionId);
    try {
      await this.redis.setex(key, this.PROGRESS_TTL, JSON.stringify(progress));

      // Also publish to channel for real-time updates
      await this.redis.publish(`progress:${sessionId}`, JSON.stringify(progress));

      console.log('[ProgressService] Progress update published to Redis');
    } catch (error) {
      this.handleRedisRuntimeError(error, 'setProgress');
    }
  }

  async getProgress(sessionId: string): Promise<ProgressUpdate | null> {
    if (!this.redisOperational) {
      return null;
    }

    const key = this.getKey(sessionId);
    let data: string | null = null;
    try {
      data = await this.redis.get(key);
    } catch (error) {
      this.handleRedisRuntimeError(error, 'getProgress');
      return null;
    }
    
    if (!data) return null;
    
    try {
      const progress = JSON.parse(data) as ProgressUpdate;
      progress.timestamp = new Date(progress.timestamp);
      return progress;
    } catch (error) {
      console.error('Failed to parse progress data:', error);
      return null;
    }
  }

  async clearProgress(sessionId: string): Promise<void> {
    if (!this.redisOperational) {
      return;
    }

    const key = this.getKey(sessionId);
    try {
      await this.redis.del(key);
    } catch (error) {
      this.handleRedisRuntimeError(error, 'clearProgress');
    }
  }

  // Records which user started a session. The progress stream checks this before subscribing.
  async registerSession(sessionId: string, userId: string): Promise<void> {
    if (!this.redisOperational) {
      return;
    }

    try {
      await this.redis.setex(`${this.OWNER_KEY_PREFIX}${sessionId}`, this.OWNER_TTL, userId);
    } catch (error) {
      this.handleRedisRuntimeError(error, 'registerSession');
    }
  }

  async getSessionOwner(sessionId: string): Promise<string | null> {
    if (!this.redisOperational) {
      return null;
    }

    try {
      return await this.redis.get(`${this.OWNER_KEY_PREFIX}${sessionId}`);
    } catch (error) {
      this.handleRedisRuntimeError(error, 'getSessionOwner');
      return null;
    }
  }

  private getJobKey(userId: string, domainKey: string): string {
    return `${this.JOB_KEY_PREFIX}${userId}:${domainKey}`;
  }

  // One analysis job per user and domain. When a job is still running, returns its session
  // id so a double submit reuses it. A claim whose progress is terminal or gone is taken over.
  // Without Redis there is no coordination, so the caller runs its own job.
  async claimOnboardingJob(userId: string, domainKey: string, sessionId: string): Promise<OnboardingJobClaim> {
    if (!this.redisOperational) {
      return { claimed: true };
    }

    const key = this.getJobKey(userId, domainKey);
    try {
      if ((await this.redis.set(key, sessionId, 'EX', this.JOB_TTL, 'NX')) === 'OK') {
        return { claimed: true };
      }

      const existing = await this.redis.get(key);
      if (existing) {
        const progress = await this.getProgress(existing);
        if (progress && !TERMINAL_STEPS.has(progress.step)) {
          return { claimed: false, sessionId: existing };
        }
      }

      await this.redis.set(key, sessionId, 'EX', this.JOB_TTL);
      return { claimed: true };
    } catch (error) {
      this.handleRedisRuntimeError(error, 'claimOnboardingJob');
      return { claimed: true };
    }
  }

  // True while this session still holds the job. A newer claim (after a takeover) makes it false.
  async isCurrentOnboardingJob(userId: string, domainKey: string, sessionId: string): Promise<boolean> {
    if (!this.redisOperational) {
      return true;
    }

    try {
      return (await this.redis.get(this.getJobKey(userId, domainKey))) === sessionId;
    } catch (error) {
      this.handleRedisRuntimeError(error, 'isCurrentOnboardingJob');
      return true;
    }
  }

  async releaseOnboardingJob(userId: string, domainKey: string, sessionId: string): Promise<void> {
    if (!this.redisOperational) {
      return;
    }

    try {
      await this.redis.eval(RELEASE_JOB_SCRIPT, 1, this.getJobKey(userId, domainKey), sessionId);
    } catch (error) {
      this.handleRedisRuntimeError(error, 'releaseOnboardingJob');
    }
  }

  async subscribeToProgress(sessionId: string, callback: (progress: ProgressUpdate) => void): Promise<() => void> {
    if (!this.redisOperational) {
      return () => undefined;
    }

    const subscriber = this.createRedisClient();
    subscriber.on('error', (error) => {
      if (this.isRedisAuthError(error)) {
        this.disableRedis(
          'authentication failed while subscribing to progress updates.',
        );
        try {
          subscriber.disconnect();
        } catch {
          // noop
        }
      }
    });

    const channel = `progress:${sessionId}`;
    try {
      await subscriber.subscribe(channel);
    } catch (error) {
      this.handleRedisRuntimeError(error, 'subscribeToProgress');
      try {
        subscriber.disconnect();
      } catch {
        // noop
      }
      return () => undefined;
    }
    
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const progress = JSON.parse(message) as ProgressUpdate;
          progress.timestamp = new Date(progress.timestamp);
          callback(progress);
        } catch (error) {
          console.error('Failed to parse progress message:', error);
        }
      }
    });

    // Return cleanup function
    return () => {
      try {
        void subscriber.unsubscribe(channel);
      } catch (err) {
        console.error('Failed to unsubscribe:', err);
      }
      try {
        void subscriber.disconnect();
      } catch (err) {
        console.error('Failed to disconnect Redis subscriber:', err);
      }
    };
  }

  // Helper method to set error state
  async setError(sessionId: string, error: string): Promise<void> {
    console.log('[ProgressService] Setting error state:', {
      sessionId: sessionId.substring(0, 8) + '...',
      error,
      timestamp: new Date().toISOString()
    });
    await this.setProgress(sessionId, 'error', 0, 'An error occurred', undefined, error);
  }

  // Helper method to set completion
  async setComplete(sessionId: string, message = 'Setup completed successfully!'): Promise<void> {
    console.log('[ProgressService] Setting completion:', {
      sessionId: sessionId.substring(0, 8) + '...',
      message,
      timestamp: new Date().toISOString()
    });
    await this.setProgress(sessionId, 'complete', 100, message);
  }

  private isRedisAuthError(error: unknown): boolean {
    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof (error as { message: unknown }).message === 'string'
            ? (error as { message: string }).message
            : '';
    return /WRONGPASS|NOAUTH|invalid username-password/i.test(message);
  }

  private disableRedis(reason: string): void {
    if (!this.redisOperational) {
      return;
    }

    this.redisOperational = false;
    console.warn(`[ProgressService] Redis disabled: ${reason}`);
    try {
      this.redis.disconnect();
    } catch {
      // noop
    }
  }

  private handleRedisRuntimeError(error: unknown, operation: string): void {
    if (this.isRedisAuthError(error)) {
      this.disableRedis(
        `authentication failed during ${operation}. Continuing without Redis.`,
      );
      return;
    }

    console.warn(
      `[ProgressService] Redis ${operation} failed:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export const progressService = new ProgressService(); 
