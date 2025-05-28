'use client';

import { ThemeProvider } from '~/components/theme-provider';
import { SessionProvider } from 'next-auth/react';
import { TRPCReactProvider } from '~/trpc/react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <TRPCReactProvider>
          {children}
          <Toaster />
        </TRPCReactProvider>
      </SessionProvider>
    </ThemeProvider>
  );
} 