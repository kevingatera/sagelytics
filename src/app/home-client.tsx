'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { type Session } from 'next-auth';
import { useEffect, useState } from 'react';

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="relative flex h-16 w-16 mx-auto animate-spin items-center justify-center rounded-full">
          <div className="absolute h-full w-full rounded-full border-t-2 border-b-2 border-primary"></div>
          <div className="absolute h-10 w-10 rounded-full border-r-2 border-l-2 border-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
}

export default function HomeClient({ session }: { session: Session }) {
  const router = useRouter();
  const { data: clientSession, status } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      setIsRedirecting(true);
      setTimeout(() => {
        if (!clientSession.user?.onboardingCompleted) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      }, 500); // Small delay to ensure loading screen shows
    }
  }, [status, clientSession?.user?.onboardingCompleted, router, session.user.onboardingCompleted]);

  // Show loading screen for any loading state or during redirect
  if (status === 'loading' || isRedirecting) {
    return <LoadingScreen />;
  }
  
  if (status === 'unauthenticated') return null;

  return null; // Don't show anything during the redirect
}
