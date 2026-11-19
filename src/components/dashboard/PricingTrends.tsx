'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { AlertCircle, BarChart3, Eye, EyeOff, Filter, Globe } from 'lucide-react';
import type { ChartRow } from '~/app/api/price-history/dashboard/summary';
import { usePriceDashboard } from './usePriceDashboard';

const RANGE_OPTIONS = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
];

const SERIES_COLORS = ['#FF9900', '#0071DC', '#E53238', '#10B981', '#F59E0B', '#8B5CF6'];
const YOUR_COLOR = '#7728f8';

function truncate(value: string, max = 25): string {
  return value.length <= max ? value : `${value.slice(0, max - 3)}...`;
}

function formatMoney(value: number): string {
  return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`;
}

function colorFor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? '#6B7280';
}

function numericValues(rows: ChartRow[], domain: string): number[] {
  return rows.flatMap((row) => {
    const value = row[domain];
    return typeof value === 'number' ? [value] : [];
  });
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function iqrBounds(values: number[]): { lower: number; upper: number } | null {
  if (values.length < 4) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  const iqr = q3 - q1;
  return { lower: q1 - 1.5 * iqr, upper: q3 + 1.5 * iqr };
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!active || !payload?.length) return null;

  return (
    <div className={`rounded-lg border ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'} p-3 shadow-lg`}>
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="flex items-center justify-between py-1">
          <span
            style={{ color: entry.color }}
            className="text-sm font-medium mr-4 max-w-[200px] truncate"
            title={String(entry.name)}
          >
            {truncate(String(entry.name))}
          </span>
          <span className="text-sm font-semibold">
            {typeof entry.value === 'number' ? formatMoney(entry.value) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

function PricingTrendsSkeleton() {
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <Skeleton className="h-6 w-[140px] mb-2" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-[180px]" />
          <Skeleton className="h-8 w-[180px]" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <Skeleton className="h-[300px] w-full mb-5" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PricingTrends() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [range, setRange] = React.useState('90');
  const [scaleType, setScaleType] = React.useState<'linear' | 'log'>('log');
  const [filterOutliers, setFilterOutliers] = React.useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = React.useState<string[]>([]);

  const { data, isLoading, error } = usePriceDashboard(Number(range));

  if (isLoading) {
    return <PricingTrendsSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Pricing Trends</CardTitle>
          <CardDescription>Competitor prices recorded by monitoring</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-10 w-10 mb-4" />
            <p>Unable to load pricing data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const domains = data.competitors.map((competitor) => competitor.domain);
  const rows = data.chart;
  const visibleDomains = domains.filter(
    (domain) => selectedCompetitors.length === 0 || selectedCompetitors.includes(domain),
  );
  const outlierBounds = filterOutliers
    ? iqrBounds(domains.flatMap((domain) => numericValues(rows, domain)))
    : null;

  const chartRows: ChartRow[] = rows.map((row) => {
    const next: ChartRow = { date: row.date };
    for (const domain of visibleDomains) {
      const value = row[domain];
      if (typeof value !== 'number') continue;
      if (outlierBounds && (value < outlierBounds.lower || value > outlierBounds.upper)) continue;
      next[domain] = value;
    }
    return next;
  });

  const averages = visibleDomains.slice(0, 3).map((domain) => ({
    domain,
    average: average(numericValues(rows, domain)),
  }));

  const toggleCompetitor = (domain: string) => {
    if (selectedCompetitors.length === 0) {
      setSelectedCompetitors(domains.filter((d) => d !== domain));
    } else if (selectedCompetitors.includes(domain)) {
      setSelectedCompetitors(selectedCompetitors.filter((d) => d !== domain));
    } else {
      setSelectedCompetitors([...selectedCompetitors, domain]);
    }
  };

  const hasCompetitors = domains.length > 0;
  const hasHistory = rows.length > 0;

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-medium">Pricing Trends</CardTitle>
          <CardDescription>Competitor prices recorded by monitoring</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScaleType(scaleType === 'linear' ? 'log' : 'linear')}
            className="h-8"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            {scaleType === 'log' ? 'Log' : 'Linear'}
          </Button>
          <Button
            variant={filterOutliers ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterOutliers(!filterOutliers)}
            className="h-8"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Tabs value={range} onValueChange={setRange} className="w-[180px]">
            <TabsList className="grid w-full grid-cols-3">
              {RANGE_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select
            value={selectedCompetitors.length === 1 ? selectedCompetitors[0] : 'all'}
            onValueChange={(value) => setSelectedCompetitors(value === 'all' ? [] : [value])}
            disabled={!hasCompetitors}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitors</SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {truncate(domain)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {!hasCompetitors ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Globe className="mx-auto h-10 w-10 mb-4" />
              <p>No competitors monitored yet</p>
              <p className="text-sm mt-2">Add competitors to start tracking pricing trends</p>
            </div>
          </div>
        ) : !hasHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="mx-auto h-10 w-10 mb-4" />
              <p>No prices recorded in the last {range} days</p>
              <p className="text-sm mt-2">Prices appear here once monitoring records them</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    {domains.map((domain, index) => (
                      <linearGradient key={domain} id={`trend-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colorFor(index)} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={colorFor(index)} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={isDark ? '#888' : '#666'} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value: number) => formatMoney(value)}
                    stroke={isDark ? '#888' : '#666'}
                    tickLine={false}
                    axisLine={false}
                    scale={scaleType}
                    domain={scaleType === 'log' ? ['dataMin', 'dataMax'] : ['auto', 'auto']}
                    allowDataOverflow={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: 15 }}
                    formatter={(value) => truncate(String(value))}
                  />

                  {data.yourAveragePrice !== null && (
                    <ReferenceLine
                      y={data.yourAveragePrice}
                      stroke={YOUR_COLOR}
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      label={{
                        value: `Your avg list price: ${formatMoney(data.yourAveragePrice)}`,
                        fill: isDark ? '#ddd' : '#555',
                        fontSize: 11,
                        position: 'insideBottomRight',
                      }}
                    />
                  )}

                  {visibleDomains.map((domain) => {
                    const index = domains.indexOf(domain);
                    return (
                      <Area
                        key={domain}
                        type="monotone"
                        dataKey={domain}
                        name={domain}
                        stroke={colorFor(index)}
                        fillOpacity={1}
                        fill={`url(#trend-${index})`}
                        strokeWidth={2}
                        connectNulls
                      />
                    );
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mb-4 mt-4">
              <div className="text-sm font-medium text-muted-foreground mb-2">Quick toggles:</div>
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => {
                  const isVisible = visibleDomains.includes(domain);
                  return (
                    <Button
                      key={domain}
                      variant={isVisible ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleCompetitor(domain)}
                    >
                      {isVisible ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                      {truncate(domain)}
                    </Button>
                  );
                })}
              </div>
            </div>

            {(filterOutliers || selectedCompetitors.length > 0) && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">
                  Active filters:
                  {filterOutliers && (
                    <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs">Outliers filtered</span>
                  )}
                  {selectedCompetitors.length > 0 && (
                    <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      {selectedCompetitors.length} competitor{selectedCompetitors.length > 1 ? 's' : ''} selected
                    </span>
                  )}
                  <button
                    className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => {
                      setFilterOutliers(false);
                      setSelectedCompetitors([]);
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4 text-center text-sm lg:grid-cols-4">
              <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
                <div className="font-semibold">Your avg list price</div>
                <div className="text-lg font-bold text-[#7728f8]">
                  {data.yourAveragePrice !== null ? formatMoney(data.yourAveragePrice) : '—'}
                </div>
              </div>
              {averages.map(({ domain, average: value }) => (
                <div key={domain} className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
                  <div className="font-semibold" title={domain}>
                    {truncate(domain)}
                  </div>
                  <div className="text-lg font-bold" style={{ color: colorFor(domains.indexOf(domain)) }}>
                    {value !== null ? formatMoney(value) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
