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
import Image from 'next/image';
export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement registration logic
    console.log('Registration attempt', { email, password, confirmPassword });
  };

  return (
    <div className="grid min-h-screen bg-gray-100 dark:bg-gray-900 lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <span className="text-2xl font-bold">Sagelytics</span>
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
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
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
                      />
                    </div>
                  </div>
                  <Button type="submit" className="mt-4 w-full">
                    Register
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-600 hover:underline">
                    Login here
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
