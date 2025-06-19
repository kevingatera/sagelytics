import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

/**
 * Wraps a server-side tRPC call and handles UNAUTHORIZED errors by redirecting to login
 * @param fn - The async function to execute (usually a tRPC procedure call)
 * @returns The result of the function call
 */
export async function withAuthRedirect<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Handle UNAUTHORIZED errors by redirecting to login
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    // Re-throw other errors to be handled by error boundaries
    throw error;
  }
}

/**
 * Higher-order function to wrap Promise.all with auth redirect handling
 * @param promises - Array of promises to await
 * @returns Promise.all result with auth error handling
 */
export async function withAuthRedirectAll<T>(promises: Promise<T>[]): Promise<T[]> {
  try {
    return await Promise.all(promises);
  } catch (error) {
    // Handle UNAUTHORIZED errors by redirecting to login
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    // Re-throw other errors to be handled by error boundaries
    throw error;
  }
}

/**
 * Utility to safely execute multiple tRPC calls with automatic auth redirect
 * Usage: const [products, competitors] = await safeCall(api.products.get(), api.competitors.get());
 */
export async function safeCall<T extends readonly unknown[]>(
  ...promises: { [K in keyof T]: Promise<T[K]> }
): Promise<T> {
  try {
    return await Promise.all(promises) as T;
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
      redirect('/login');
    }
    throw error;
  }
}

/**
 * Simple utility for single tRPC calls with auth redirect
 * Usage: const products = await $(api.competitor.getProducts());
 */
// export async function $<T>(promise: Promise<T>): Promise<T> {
//   try {
//     return await promise;
//   } catch (error) {
//     if (error instanceof TRPCError && error.code === 'UNAUTHORIZED') {
//       redirect('/login');
//     }
//     throw error;
//   }
// } 