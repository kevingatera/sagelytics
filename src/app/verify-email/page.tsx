'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LineChart } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { PatternBackground } from '~/components/ui/pattern-background';
import { ResendVerificationForm } from '~/components/resend-verification-form';

type Status = 'idle' | 'verifying' | 'verified' | 'failed';

interface VerifyResponse {
  code?: 'wrong_password' | 'stale' | 'invalid_token';
  message?: string;
}

function VerifyEmailCard() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<Status>('idle');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Confirmation needs the account password, so a link scanner that opens the URL cannot use
  // up the token, and nobody can confirm an address for a password someone else chose.
  const confirm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !password) return;
    setStatus('verifying');
    setPasswordError('');
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (response.ok) {
        setStatus('verified');
        return;
      }
      const data = (await response.json().catch(() => ({}))) as VerifyResponse;
      if (data.code === 'wrong_password' || data.code === 'stale' || response.status === 429) {
        setPasswordError(data.message ?? 'Please try again.');
        setStatus('idle');
        return;
      }
      setMessage(data.message ?? 'This verification link is invalid, expired or already used.');
      setStatus('failed');
    } catch {
      setPasswordError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resend verification email</CardTitle>
          <CardDescription>
            Enter the email address you registered with and we&apos;ll send a new confirmation link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResendVerificationForm />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm your email address</CardTitle>
        <CardDescription>
          Enter the password you chose when you signed up to finish setting up your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'verified' ? (
          <div role="status" className="space-y-4 text-center">
            <p>Your email address is confirmed. You can now log in.</p>
            <Button asChild className="w-full">
              <Link href="/login">Go to login</Link>
            </Button>
          </div>
        ) : status === 'failed' ? (
          <div className="space-y-4">
            <p role="alert" className="text-center text-destructive">
              {message}
            </p>
            <p className="text-sm text-muted-foreground">Request a new link below.</p>
            <ResendVerificationForm />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={confirm}>
            <div className="space-y-2">
              <Label htmlFor="verify-password">Password</Label>
              <Input
                id="verify-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={passwordError ? 'verify-password-error' : undefined}
              />
            </div>
            {passwordError ? (
              <p id="verify-password-error" role="alert" className="text-sm text-destructive">
                {passwordError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={status === 'verifying' || !password}>
              {status === 'verifying' ? 'Confirming...' : 'Confirm email'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t choose this password?{' '}
              <Link href="/forgot-password" className="text-primary hover:underline">
                Reset it
              </Link>{' '}
              to confirm your email instead.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LineChart className="size-4" aria-hidden="true" />
            </div>
            Sagelytics
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <Suspense fallback={null}>
              <VerifyEmailCard />
            </Suspense>
            <p className="pt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <PatternBackground className="absolute inset-0" />
      </div>
    </div>
  );
}
