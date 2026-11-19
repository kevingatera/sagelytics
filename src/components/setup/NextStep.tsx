'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClipboardList, Package, Store } from 'lucide-react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';

export type SetupStep = 'onboarding' | 'competitor' | 'product';

// Read from the database: the session flag is only set at sign-in, so it lags behind onboarding.
export function useOnboardingComplete(): boolean | undefined {
  const onboarding = api.user.getOnboarding.useQuery();
  if (onboarding.isPending || onboarding.isError) return undefined;
  return onboarding.data?.completed === true;
}

/** The first setup step still to do, null when setup is done, undefined while unknown. */
export function useNextSetupStep(): SetupStep | null | undefined {
  const onboardingComplete = useOnboardingComplete();
  const competitors = api.competitor.get.useQuery();
  const products = api.competitor.getProducts.useQuery();

  if (onboardingComplete === undefined) return undefined;
  if (!onboardingComplete) return 'onboarding';
  if (competitors.isPending || competitors.isError) return undefined;
  if (competitors.data.competitors.length === 0) return 'competitor';
  if (products.isPending || products.isError) return undefined;
  if (products.data.length === 0) return 'product';
  return null;
}

const STEPS: Record<
  SetupStep,
  { icon: typeof Store; title: string; description: string; href: string; action: string }
> = {
  onboarding: {
    icon: ClipboardList,
    title: 'Finish setting up your business',
    description: 'Tell Sagelytics about your business so it can find your competitors and products.',
    href: '/onboarding',
    action: 'Finish setup',
  },
  competitor: {
    icon: Store,
    title: 'Add your first competitor',
    description: 'Add a competitor website to start comparing their prices with yours.',
    href: '/competitors',
    action: 'Add a competitor',
  },
  product: {
    icon: Package,
    title: 'Add your first product',
    description: 'Add one of your products so there is something to compare competitor prices against.',
    href: '/products',
    action: 'Add a product',
  },
};

interface NextStepCardProps {
  step: SetupStep;
  /** Lets the step be done in place, replacing the link to the page that does it. */
  children?: ReactNode;
  className?: string;
}

export function NextStepCard({ step, children, className }: NextStepCardProps) {
  const { icon: Icon, title, description, href, action } = STEPS[step];
  return (
    <Card className={cn('border-primary/40', className)}>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {!children && (
            <Button asChild className="w-full sm:w-auto">
              <Link href={href}>{action}</Link>
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Shows the first setup step still to do, and nothing once setup is complete. */
export function SetupNextStep({ className }: { className?: string }) {
  const step = useNextSetupStep();
  if (!step) return null;
  return <NextStepCard step={step} className={className} />;
}
