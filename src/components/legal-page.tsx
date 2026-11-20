import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { ThemeToggle } from '~/components/theme-toggle';
import { cn } from '~/lib/utils';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-background px-4 py-4 sm:px-6">
        <div className="container mx-auto flex items-center justify-between px-0">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <LineChart className="h-6 w-6 text-primary" aria-hidden="true" />
            Sagelytics
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="container mx-auto max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: <time dateTime="2026-11-19">November 19, 2026</time>
        </p>
        <div className="mt-8 space-y-4 leading-7">{children}</div>
      </main>
      <footer className="border-t bg-accent px-6 py-8">
        <div className="container mx-auto flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
          <LegalLinks />
          <p>&copy; {new Date().getFullYear()} Sagelytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={cn('flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground', className)}
    >
      <Link href="/privacy" className="hover:text-foreground hover:underline">
        Privacy Policy
      </Link>
      <Link href="/terms" className="hover:text-foreground hover:underline">
        Terms of Service
      </Link>
    </nav>
  );
}
