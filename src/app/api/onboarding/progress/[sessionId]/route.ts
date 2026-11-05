import type { NextRequest } from 'next/server';
import { auth } from '~/server/auth';
import {
  progressService,
  type ProgressUpdate,
} from '~/lib/services/progress-service';
import { createStreamLimiter } from '~/lib/services/progress-stream-limiter';

// A setup run takes a few minutes. This caps how long one stream stays open.
const MAX_STREAM_LIFETIME_MS = 15 * 60 * 1000;
const MAX_STREAMS_PER_USER = 3;
const HEARTBEAT_MS = 30_000;

const streamLimiter = createStreamLimiter(MAX_STREAMS_PER_USER);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  // Unknown and foreign sessions get the same answer, so session ids cannot be probed.
  const owner = await progressService.getSessionOwner(sessionId);
  if (owner !== userId) {
    return new Response('Not found', { status: 404 });
  }

  const release = streamLimiter.acquire(userId);
  if (!release) {
    return new Response('Too many open progress streams', { status: 429 });
  }

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let closed = false;
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let lifetimeTimer: ReturnType<typeof setTimeout> | undefined;
  let completeTimer: ReturnType<typeof setTimeout> | undefined;

  // Single teardown path for client disconnect, completion, lifetime expiry and
  // write failure. Safe to call more than once.
  const close = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(lifetimeTimer);
    clearTimeout(completeTimer);
    unsubscribe?.();
    unsubscribe = null;
    release();
    try {
      controller?.close();
    } catch {
      // The runtime already closed the stream.
    }
  };

  const write = (chunk: string) => {
    if (closed || !controller) return;
    try {
      controller.enqueue(encoder.encode(chunk));
    } catch {
      close();
    }
  };

  const sendProgress = (progress: ProgressUpdate) => {
    write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);

    if (progress.step === 'complete' || progress.step === 'error') {
      clearTimeout(completeTimer);
      completeTimer = setTimeout(close, 1000);
    }
  };

  const sendError = (message: string, error: unknown) => {
    write(
      `data: ${JSON.stringify({
        type: 'error',
        message,
        error: error instanceof Error ? error.message : 'Progress service unavailable',
      })}\n\n`,
    );
  };

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      request.signal.addEventListener('abort', close);
      if (request.signal.aborted) close();

      lifetimeTimer = setTimeout(close, MAX_STREAM_LIFETIME_MS);
      heartbeat = setInterval(() => write(': heartbeat\n\n'), HEARTBEAT_MS);

      write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

      void progressService
        .getProgress(sessionId)
        .then((progress) => {
          if (progress) sendProgress(progress);
        })
        .catch((error: unknown) => {
          console.error('Failed to get current progress:', error);
          sendError('Failed to retrieve current progress', error);
        });

      progressService
        .subscribeToProgress(sessionId, sendProgress)
        .then((cleanup) => {
          // The client may have left while subscribing. Release at once in that case.
          if (closed) {
            cleanup();
          } else {
            unsubscribe = cleanup;
          }
        })
        .catch((error: unknown) => {
          console.error('Failed to subscribe to progress updates:', error);
          sendError('Failed to connect to progress service', error);
        });
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
