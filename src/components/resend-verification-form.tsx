'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

type State = 'idle' | 'sending' | 'sent' | 'unavailable' | 'error';

export function ResendVerificationForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [state, setState] = useState<State>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.status === 503) setState('unavailable');
      else setState(response.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        If that address belongs to an account that still needs confirming, a new link is on its way.
      </p>
    );
  }

  if (state === 'unavailable') {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        Verification email is not configured on this server yet. Contact your administrator.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="resend-email">Email</Label>
        <Input
          id="resend-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'sending'}
        />
      </div>
      {state === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending...' : 'Resend verification email'}
      </Button>
    </form>
  );
}
