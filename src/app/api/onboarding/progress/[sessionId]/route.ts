import type { NextRequest } from 'next/server';
import { progressService } from '~/lib/services/progress-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isConnectionClosed = false;
      
      const sendEvent = (data: unknown) => {
        if (isConnectionClosed) return;
        
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error('Failed to send SSE event:', error);
          sendEvent({ 
            type: 'error', 
            message: 'Failed to send progress update',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      };

      // Send initial connection message
      sendEvent({ type: 'connected', sessionId });

      // Send current progress if available
      void progressService.getProgress(sessionId).then((progress) => {
        if (progress && !isConnectionClosed) {
          sendEvent({ type: 'progress', ...progress });
        }
      }).catch((error) => {
        console.error('Failed to get current progress:', error);
        sendEvent({ 
          type: 'error', 
          message: 'Failed to retrieve current progress',
          error: error instanceof Error ? error.message : 'Progress service unavailable'
        });
      });

      // Subscribe to progress updates
      let unsubscribe: (() => void) | null = null;
      
      void progressService.subscribeToProgress(sessionId, (progress) => {
        if (isConnectionClosed) return;
        
        sendEvent({ type: 'progress', ...progress });
        
        // Close connection on completion or error
        if (progress.step === 'complete' || progress.step === 'error') {
          setTimeout(() => {
            if (unsubscribe) unsubscribe();
            isConnectionClosed = true;
            controller.close();
          }, 1000);
        }
      }).then((cleanup) => {
        unsubscribe = cleanup;
      }).catch((error) => {
        console.error('Failed to subscribe to progress updates:', error);
        sendEvent({ 
          type: 'error', 
          message: 'Failed to connect to progress service',
          error: error instanceof Error ? error.message : 'Subscription failed'
        });
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`Client disconnected from progress stream: ${sessionId}`);
        isConnectionClosed = true;
        if (unsubscribe) unsubscribe();
        controller.close();
      });

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (isConnectionClosed) {
          clearInterval(heartbeat);
          return;
        }
        
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          console.error('Heartbeat failed:', error);
          clearInterval(heartbeat);
          isConnectionClosed = true;
        }
      }, 30000); // Send heartbeat every 30 seconds
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
} 