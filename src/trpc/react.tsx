'use client';

import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { loggerLink, unstable_httpBatchStreamLink, TRPCClientError, type TRPCLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { type inferRouterInputs, type inferRouterOutputs } from '@trpc/server';
import { useState } from 'react';
import SuperJSON from 'superjson';
import { observable } from '@trpc/server/observable';

import { type AppRouter } from '~/server/api/root';
import { createQueryClient } from './query-client';
import { toast } from 'sonner';

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Custom error handling link
 * Handles UNAUTHORIZED errors and redirects to login
 */
const errorHandlingLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next: (value) => observer.next(value),
        error: (error) => {
          // Check if it's an UNAUTHORIZED error
          if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
            // Only redirect if we're in the browser
            if (typeof window !== 'undefined') {
              toast.error('Session expired', {
                description: 'Please log in again to continue.',
              });
              window.location.href = '/login';
              return;
            }
          }
          observer.error(error);
        },
        complete: () => observer.complete(),
      });
      return unsubscribe;
    });
  };
};

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        errorHandlingLink,
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + '/api/trpc',
          headers: () => {
            const headers = new Headers();
            headers.set('x-trpc-source', 'nextjs-react');
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
