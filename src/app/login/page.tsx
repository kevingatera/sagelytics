'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { LoginForm } from '~/components/login-form';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PatternBackground } from '~/components/ui/pattern-background';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user) {
      void router.push('/');
    }
  }, [session, router]);
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Image
                src="/owl-logo.png"
                alt="Sagelytics"
                className="size-4"
                width={16}
                height={16}
              />
            </div>
            Sagelytics
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <PatternBackground className="absolute inset-0" />
      </div>
    </div>
  );
}
