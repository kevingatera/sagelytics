import { useRouter } from 'next/navigation';
import { TRPCClientError } from '@trpc/client';
import { toast } from 'sonner';

/**
 * Hook to handle UNAUTHORIZED errors and redirect to login
 */
export function useAuthErrorHandler() {
  const router = useRouter();

  const handleError = (error: unknown) => {
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      toast.error('Session expired', {
        description: 'Please log in again to continue.',
      });
      router.push('/login');
      return true; // Indicates the error was handled
    }
    return false; // Indicates the error was not handled
  };

  return { handleError };
} 