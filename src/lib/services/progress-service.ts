import { Redis } from 'ioredis';

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

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB ?? '0'),
      enableReadyCheck: false,
      lazyConnect: true,
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

    const key = this.getKey(sessionId);
    await this.redis.setex(key, this.PROGRESS_TTL, JSON.stringify(progress));
    
    // Also publish to channel for real-time updates
    await this.redis.publish(`progress:${sessionId}`, JSON.stringify(progress));
    
    console.log('[ProgressService] Progress update published to Redis');
  }

  async getProgress(sessionId: string): Promise<ProgressUpdate | null> {
    const key = this.getKey(sessionId);
    const data = await this.redis.get(key);
    
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
    const key = this.getKey(sessionId);
    await this.redis.del(key);
  }

  async subscribeToProgress(sessionId: string, callback: (progress: ProgressUpdate) => void): Promise<() => void> {
    const subscriber = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB ?? '0'),
    });

    const channel = `progress:${sessionId}`;
    
    await subscriber.subscribe(channel);
    
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
      void subscriber.unsubscribe(channel);
      void subscriber.disconnect();
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
}

export const progressService = new ProgressService(); 