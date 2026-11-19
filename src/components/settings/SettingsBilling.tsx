'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { Skeleton } from '~/components/ui/skeleton';
import { formatBillingDate, planLabel } from '~/lib/billing/limit-message';
import { api } from '~/trpc/react';

// The webhook can land a few seconds after Stripe redirects back, so poll briefly after checkout.
const UPGRADE_POLL_MS = 3_000;
const UPGRADE_POLL_WINDOW_MS = 60_000;

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  unpaid: 'Unpaid',
  paused: 'Paused',
};

function statusLabel(status: string | null): string {
  if (!status) return 'No subscription';
  return STATUS_LABELS[status] ?? status;
}

function UsageRow({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number;
  hint: string;
}) {
  const id = useId();
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : used > 0 ? 100 : 0;
  const atLimit = used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      {/* The shared ui/progress wrapper drops `value`, which leaves the bar indeterminate for
          assistive tech, so the primitive is used directly here. */}
      <ProgressPrimitive.Root
        value={Math.min(used, limit)}
        max={Math.max(limit, 1)}
        getValueLabel={() => `${used} of ${limit} used`}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <ProgressPrimitive.Indicator
          className={atLimit ? 'h-full w-full bg-destructive transition-all' : 'h-full w-full bg-primary transition-all'}
          style={{ transform: `translateX(-${100 - percent}%)` }}
        />
      </ProgressPrimitive.Root>
      <p id={`${id}-hint`} className={atLimit ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
        {atLimit ? `Limit reached. ${hint}` : hint}
      </p>
    </div>
  );
}

async function redirectTo(endpoint: '/api/billing/checkout' | '/api/billing/portal') {
  const response = await fetch(endpoint, { method: 'POST' });
  const body = (await response.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    portalUrl?: string;
  };
  // Checkout answers 409 with a portal link when the user already has a subscription.
  if (response.status === 409 && body.portalUrl) {
    window.location.assign(body.portalUrl);
    return;
  }
  if (!response.ok || !body.url) {
    if (response.status === 503) throw new Error("Paid plans aren't available yet.");
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  window.location.assign(body.url);
}

export function SettingsBilling() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noteId = useId();
  const [pollUntil, setPollUntil] = useState(0);
  const [pending, setPending] = useState<'checkout' | 'portal' | null>(null);
  const handledCheckout = useRef<string | null>(null);

  const status = api.billing.getStatus.useQuery(undefined, {
    refetchInterval: (query) =>
      Date.now() < pollUntil && query.state.data?.plan !== 'pro' ? UPGRADE_POLL_MS : false,
  });
  const { refetch } = status;

  const checkout = searchParams.get('checkout');
  useEffect(() => {
    if (!checkout || handledCheckout.current === checkout) return;
    handledCheckout.current = checkout;

    if (checkout === 'success') {
      toast.success('Thanks for subscribing', {
        description: 'Your plan updates as soon as Stripe confirms the payment.',
      });
      setPollUntil(Date.now() + UPGRADE_POLL_WINDOW_MS);
      void refetch();
    } else if (checkout === 'cancelled' || checkout === 'cancel') {
      toast('Checkout cancelled', { description: 'You have not been charged.' });
    }

    // Drop the one-shot flags so a reload does not repeat the toast.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('checkout');
    params.delete('session_id');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [checkout, pathname, refetch, router, searchParams]);

  const startRedirect = async (kind: 'checkout' | 'portal') => {
    setPending(kind);
    try {
      await redirectTo(kind === 'checkout' ? '/api/billing/checkout' : '/api/billing/portal');
    } catch (error) {
      toast.error(kind === 'checkout' ? 'Could not start checkout' : 'Could not open billing', {
        description: error instanceof Error ? error.message : undefined,
      });
      setPending(null);
    }
  };

  if (status.isLoading) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (status.error || !status.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing</CardTitle>
          <CardDescription>We couldn&apos;t load your plan and usage.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const data = status.data;
  const isPro = data.plan === 'pro';
  const { discoveries, monitoredProducts } = data.usage;
  const periodEnd = formatBillingDate(data.periodEnd);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>Current plan</CardTitle>
            <Badge variant={isPro ? 'default' : 'secondary'}>{planLabel(data.plan)}</Badge>
          </div>
          <CardDescription>
            {isPro
              ? 'Your subscription is managed through Stripe.'
              : 'The free plan includes the allowance below each calendar month.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium">{statusLabel(data.status)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">
                  {data.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                </dt>
                <dd className="font-medium">{periodEnd}</dd>
              </div>
            </dl>
          ) : null}
          {isPro && data.cancelAtPeriodEnd ? (
            <p className="text-sm text-muted-foreground">
              Your plan cancels on {periodEnd}. You keep Pro limits until then.
            </p>
          ) : null}
          {!data.billingEnabled ? (
            <p id={noteId} className="text-sm text-muted-foreground">
              Paid plans aren&apos;t available yet.
            </p>
          ) : null}
        </CardContent>
        <CardFooter>
          {isPro ? (
            <Button
              onClick={() => void startRedirect('portal')}
              disabled={pending !== null || !data.billingEnabled}
            >
              {pending === 'portal' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Manage billing
            </Button>
          ) : (
            <Button
              onClick={() => void startRedirect('checkout')}
              disabled={pending !== null || !data.billingEnabled}
              aria-describedby={data.billingEnabled ? undefined : noteId}
            >
              {pending === 'checkout' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Upgrade
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            {isPro ? `Current billing period, ending ${periodEnd}.` : 'This calendar month (UTC).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UsageRow
            label="Competitor discoveries"
            used={discoveries.used}
            limit={discoveries.limit}
            hint={`Resets on ${formatBillingDate(discoveries.periodEnd)}.`}
          />
          <UsageRow
            label="Monitored products"
            used={monitoredProducts.used}
            limit={monitoredProducts.limit}
            hint="Product URLs across all monitoring tasks. Remove some to free up space."
          />
        </CardContent>
      </Card>
    </div>
  );
}
