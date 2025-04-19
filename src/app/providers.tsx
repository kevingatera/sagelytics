'use client';

import { ThemeProvider } from '~/components/theme/ThemeProvider';
import { SessionProvider } from 'next-auth/react';
import { TRPCReactProvider } from '~/trpc/react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system">
      <SessionProvider>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </SessionProvider>
    </ThemeProvider>
  );
} 