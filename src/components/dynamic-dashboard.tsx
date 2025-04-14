'use client';

import { api } from '~/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { type MetricComparison } from '~/lib/metrics-service';
import { cn } from '~/lib/utils';
import { Icons } from './icons';
import { Skeleton } from './ui/skeleton';

interface MetricValueProps {
  metric: string;
  comparison?: MetricComparison;
}

function DashboardSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-[120px]" />
            <Skeleton className="h-4 w-[80px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricIcon({ icon }: { icon: keyof typeof Icons }) {
  const IconComp = Icons[icon];
  return IconComp ? <IconComp className="h-4 w-4 text-muted-foreground" /> : null;
}

function formatValue(metric: string, value: number): string {
  const formatters: Record<string, (val: number) => string> = {
    revenue: (val) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
      }).format(val),
    inventory_value: (val) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
      }).format(val),
    repricing_actions: (val) => val.toString(),
    active_listings: (val) => val.toString(),
  };
  return formatters[metric]?.(value) ?? value.toString();
}

function MetricValue({ metric, comparison }: MetricValueProps) {
  const value = comparison?.current ?? 0;
  const trend = comparison?.trend ?? 0;

  return (
    <>
      <div className="text-2xl font-bold">{formatValue(metric, value)}</div>
      <p
        className={cn(
          'text-xs',
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-muted-foreground',
        )}
      >
        {trend > 0 ? '+' : ''}
        {trend.toFixed(1)}% from last period
      </p>
    </>
  );
}

function MetricCard({ metric }: { metric: { key: string; name: string; icon: string } }) {
  const { data: comparison, isLoading } = api.competitor.getComparisons.useQuery(
    { metric: metric.key },
    { enabled: !!metric.key },
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
        <MetricIcon icon={metric.icon} />
      </CardHeader>
      <CardContent>
        <MetricValue metric={metric.key} comparison={comparison ?? undefined} />
      </CardContent>
    </Card>
  );
}

export function DynamicDashboard() {
  const { data: metrics, isLoading } = api.competitor.getRelevantMetrics.useQuery();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics?.map((metric) => <MetricCard key={metric.key} metric={metric} />)}
    </div>
  );
}
