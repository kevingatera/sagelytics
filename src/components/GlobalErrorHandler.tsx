'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TRPCClientError } from '@trpc/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Component that handles global UNAUTHORIZED errors from tRPC
 */
export function GlobalErrorHandler() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleError = (error: unknown) => {
      if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
        toast.error('Session expired', {
          description: 'Please log in again to continue.',
        });
        // Clear all queries to prevent stale data
        queryClient.clear();
        router.push('/login');
      }
    };

    // Set up global error handling for queries
    queryClient.setMutationDefaults(['**'], {
      onError: handleError,
    });

    return () => {
      // Clean up - reset to default
      queryClient.setMutationDefaults(['**'], {});
    };
  }, [router, queryClient]);

  // This component doesn't render anything
  return null;
} 