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

export class ProgressService {
  private redis: Redis;
  private readonly PROGRESS_KEY_PREFIX = 'onboarding:progress:';
  private readonly PROGRESS_TTL = 600; // 10 minutes
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
