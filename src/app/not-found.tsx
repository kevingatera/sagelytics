import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { auth } from '~/server/auth';

export default async function NotFound() {
  const session = await auth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent p-4">
      <div className="text-center">
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <LineChart className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Sagelytics</span>
        </Link>
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        <Button asChild size="lg">
          <Link href={session?.user ? '/dashboard' : '/'}>
            {session?.user ? 'Back to dashboard' : 'Back to home'}
          </Link>
        </Button>
      </div>
    </div>
  );
}
