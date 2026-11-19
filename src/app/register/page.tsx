'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '~/components/ui/card';
import { LineChart } from 'lucide-react';
import { PatternBackground } from '~/components/ui/pattern-background';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState<{ email: string; emailDelivery: 'sent' | 'disabled' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, password }),
      });
      
      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? 'Registration failed');
      }

      const data = (await response.json()) as { emailDelivery?: 'sent' | 'disabled' };
      setRegistered({ email: email.trim(), emailDelivery: data.emailDelivery ?? 'sent' });
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <Card>
              <CardHeader>
                <CardTitle>Register for Sagelytics</CardTitle>
                <CardDescription>Create your account to get started</CardDescription>
              </CardHeader>
              <CardContent>
                {registered ? (
                  <div role="status" className="space-y-4 text-center">
                    <h2 className="text-lg font-semibold">Check your email</h2>
                    {registered.emailDelivery === 'sent' ? (
                      <p className="text-muted-foreground">
                        We sent a confirmation link to {registered.email}. Open it to confirm your
                        address, then log in. If you already have an account, we sent you a note
                        instead.
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Email delivery is not configured on this server, so no confirmation link was
                        sent. Contact your administrator to confirm your account.
                      </p>
                    )}
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login">Go to login</Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="mt-4 w-full" disabled={isLoading}>
                      {isLoading ? 'Registering...' : 'Register'}
                    </Button>
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline">
                    Login here
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <PatternBackground className="absolute inset-0" />
      </div>
    </div>
  );
}
