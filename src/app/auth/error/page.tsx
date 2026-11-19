import { type Metadata } from 'next';
import Link from 'next/link';
import { LineChart } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { PatternBackground } from '~/components/ui/pattern-background';

export const metadata: Metadata = { title: 'Sign-in problem' };

interface ErrorCopy {
  title: string;
  description: string;
  passwordHint: boolean;
}

const PASSWORD_HINT =
  'Sign in with your email and password instead. If you do not have a password or have forgotten it, reset it from the link we email you.';

const ERRORS: Record<string, ErrorCopy> = {
  GoogleEmailMismatch: {
    title: 'Google sign-in was refused',
    description:
      "The email address on this Google account does not match the email address of the Sagelytics account it is linked to, so we can't use it to sign you in.",
    passwordHint: true,
  },
  GoogleEmailUnverified: {
    title: 'Google sign-in was refused',
    description: "Google hasn't confirmed the email address on this Google account, so we can't use it to sign you in.",
    passwordHint: true,
  },
  GoogleLinkUnproven: {
    title: 'Google sign-in was refused',
    description:
      "Google doesn't manage the email address on this Google account, so it can't confirm you still own that mailbox. Confirm your email address from the link we email you, or reset your password, then sign in with your email and password.",
    passwordHint: false,
  },
  OAuthAccountNotLinked: {
    title: 'This email already has an account',
    description: 'An account with this email address already exists, and this Google account is not linked to it.',
    passwordHint: true,
  },
  AccessDenied: {
    title: 'Sign-in was refused',
    description: 'You are not allowed to sign in this way.',
    passwordHint: true,
  },
};

const FALLBACK: ErrorCopy = {
  title: 'Sign-in failed',
  description: 'Something went wrong while signing you in. Please try again.',
  passwordHint: false,
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const code = typeof error === 'string' ? error : '';
  const copy = Object.hasOwn(ERRORS, code) ? ERRORS[code]! : FALLBACK;

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
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {copy.passwordHint ? <p className="text-sm">{PASSWORD_HINT}</p> : null}
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <Link href="/login">Sign in with your password</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/forgot-password">Reset your password</Link>
                  </Button>
                </div>
              </CardContent>
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
