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
  ReferenceLine 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "~/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { AlertCircle, BarChart3, Filter, Eye, EyeOff } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { TooltipProps } from 'recharts';
import { formatCompetitorName } from "~/lib/utils/competitor";

// Helper function to truncate long competitor names
const getDisplayName = (domain: string): string => {
  if (domain.length <= 25) return domain;
  
  // Try to extract meaningful part
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (cleanDomain.length <= 25) return cleanDomain;
  
  // Extract main domain and path
  const parts = cleanDomain.split('/');
  const mainDomain = parts[0]?.split('.')[0] ?? domain;
  const path = parts.slice(1).join('/');
  
  if (path) {
    const truncated = `${mainDomain}/${path}`;
    return truncated.length <= 25 ? truncated : `${mainDomain}/...${path.slice(-8)}`;
  }
  
  return cleanDomain.slice(0, 22) + '...';
};

// Helper function to get full domain for tooltip
const getFullName = (domain: string): string => {
  return domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
};

// Define data type
type DataPoint = {
  date: string;
  YourPrice: number;
  [key: string]: string | number; // Index signature for dynamic access
};

// Custom tooltip component for better theme handling
interface CustomTooltipProps extends Omit<TooltipProps<number, string>, 'payload'> {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  if (active && payload?.length) {
    return (
      <div className={`rounded-lg border ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'} p-3 shadow-lg`}>
        <p className="text-sm font-medium text-muted-foreground mb-2">{label} 2023</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between py-1">
            <span 
              style={{ color: entry.color }} 
              className="text-sm font-medium mr-4 max-w-[200px] truncate"
              title={entry.name === 'Your Price' ? entry.name : getFullName(entry.name)}
            >
              {entry.name === 'Your Price' ? entry.name : getDisplayName(entry.name)}
            </span>
            <span className="text-sm font-semibold">
              ${entry.value >= 1000 ? `${(entry.value / 1000).toFixed(1)}k` : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
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
  const [scaleType, setScaleType] = React.useState<'linear' | 'log'>('log');
  const [filterOutliers, setFilterOutliers] = React.useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = React.useState<string[]>([]);
  const [showOnlyYours, setShowOnlyYours] = React.useState(false);
  
  const { data, isLoading, error } = api.competitor.get.useQuery();

  // Memoize competitor list to avoid new reference each render
  const competitors = React.useMemo(() => data?.competitors ?? [], [data]);

  const displayNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    competitors.forEach((c) => {
      map.set(c.domain, formatCompetitorName(c.domain, c.businessName));
    });
    return map;
  }, [competitors]);

  const getDisplayNameLocal = (domain: string): string => {
    return displayNameMap.get(domain) ?? getDisplayName(domain);
  };

  if (isLoading) {
    return <PricingTrendsSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Pricing Trends</CardTitle>
          <CardDescription>Your prices vs competitors across platforms</CardDescription>
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

  // Use real data from API or fallback to sample data
  const { priceData } = data;
  
  // Transform the priceData from API into chart format
  const chartData: DataPoint[] = priceData.labels.map((label, index) => {
    const dataPoint: DataPoint = {
      date: label,
      YourPrice: priceData.datasets.find(d => d.label === 'Your Price')?.data[index] ?? 0,
    };
    
    // Add competitor data dynamically
    competitors.forEach(competitor => {
      const competitorDataset = priceData.datasets.find(d => d.label === competitor.domain);
      if (competitorDataset) {
        dataPoint[competitor.domain] = competitorDataset.data[index] ?? 0;
      }
    });
    
    return dataPoint;
  });

  // Calculate averages
  const calculateAverage = (key: string): number => {
    const values = chartData.map(item => item[key] as number).filter(val => val > 0);
    return values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0;
  };

  const averageYourPrice = calculateAverage('YourPrice');
  
  // Get competitor averages
  const competitorAverages = competitors.map(competitor => ({
    domain: competitor.domain,
    average: calculateAverage(competitor.domain)
  })).filter(comp => comp.average > 0);

  // Find min and max price points across all data
  const allPrices = chartData.flatMap(item => 
    Object.entries(item)
      .filter(([key]) => key !== 'date')
      .map(([, value]) => value as number)
      .filter(val => val > 0)
  );

  // Filter outliers if enabled
  const getFilteredPrices = () => {
    if (!filterOutliers || allPrices.length === 0) return allPrices;
    
    const sorted = [...allPrices].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    
    if (q1 === undefined || q3 === undefined) return sorted;
    
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return sorted.filter(price => price >= lowerBound && price <= upperBound);
  };

  const filteredPrices = getFilteredPrices();
  const minPrice = filteredPrices.length > 0 ? Math.min(...filteredPrices) : 0;
  const maxPrice = filteredPrices.length > 0 ? Math.max(...filteredPrices) : 100;

  // Filter chart data based on outliers and competitor selection
  const getFilteredChartData = () => {
    if (!filterOutliers && selectedCompetitors.length === 0 && !showOnlyYours) {
      return chartData;
    }

    return chartData.map(dataPoint => {
      const filtered: DataPoint = { date: dataPoint.date, YourPrice: dataPoint.YourPrice };
      
      // Add competitor data based on filters
      competitors.forEach(competitor => {
        const value = dataPoint[competitor.domain] as number;
        const shouldInclude = !showOnlyYours && 
          (selectedCompetitors.length === 0 || selectedCompetitors.includes(competitor.domain)) &&
          (!filterOutliers || (value >= minPrice && value <= maxPrice));
        
        if (shouldInclude) {
          filtered[competitor.domain] = value;
        }
      });
      
      return filtered;
    });
  };

  const filteredChartData = getFilteredChartData();

  // Color mapping for competitors
  const getCompetitorColor = (domain: string, index: number) => {
    const colors = ['#FF9900', '#0071DC', '#E53238', '#10B981', '#F59E0B', '#8B5CF6'];
    return colors[index % colors.length] ?? '#6B7280';
  };

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg font-medium">Pricing Trends</CardTitle>
          <CardDescription>Your prices vs competitors across platforms</CardDescription>
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
            variant={filterOutliers ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterOutliers(!filterOutliers)}
            className="h-8"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Tabs defaultValue="30d" className="w-[180px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="1y">1y</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select 
            defaultValue="all" 
            onValueChange={(value) => {
              if (value === 'all') {
                setSelectedCompetitors([]);
                setShowOnlyYours(false);
              } else if (value === 'yours') {
                setSelectedCompetitors([]);
                setShowOnlyYours(true);
              } else {
                setSelectedCompetitors([value]);
                setShowOnlyYours(false);
              }
            }}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitors</SelectItem>
              <SelectItem value="yours">Your Price Only</SelectItem>
              {competitors.map(competitor => (
                <SelectItem key={competitor.domain} value={competitor.domain}>
                  {getDisplayNameLocal(competitor.domain)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {chartData.length > 0 ? (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorYourPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7728f8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#7728f8" stopOpacity={0} />
                    </linearGradient>
                    {competitors.map((competitor, index) => (
                      <linearGradient key={competitor.domain} id={`color${competitor.domain.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getCompetitorColor(competitor.domain, index)} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={getCompetitorColor(competitor.domain, index)} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#333" : "#e5e7eb"} opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    stroke={isDark ? "#888" : "#666"}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => {
                      if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                      return `$${value}`;
                    }}
                    stroke={isDark ? "#888" : "#666"}
                    tickLine={false}
                    axisLine={false}
                    scale={scaleType}
                    domain={scaleType === 'log' ? ['dataMin', 'dataMax'] : [Math.max(0, minPrice - 50), maxPrice + 50]}
                    allowDataOverflow={false}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: 15 }}
                    formatter={(value: string | number) => {
                      if (value === 'Your Price') return value;
                      return getDisplayNameLocal(value as string);
                    }}
                  />
                  
                  {/* Add reference line for your average */}
                  {averageYourPrice > 0 && (
                    <ReferenceLine 
                      y={averageYourPrice} 
                      stroke="#7728f8" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5}
                      label={{ 
                        value: `Your Avg: $${averageYourPrice >= 1000 ? `${(averageYourPrice / 1000).toFixed(1)}k` : averageYourPrice}`,
                        fill: isDark ? '#ddd' : '#555',
                        fontSize: 11,
                        position: 'insideBottomRight'
                      }} 
                    />
                  )}
                  
                  {/* Your Price Area */}
                  <Area 
                    type="monotone" 
                    dataKey="YourPrice" 
                    name="Your Price"
                    stroke="#7728f8" 
                    fillOpacity={1} 
                    fill="url(#colorYourPrice)" 
                    strokeWidth={3}
                  />
                  
                  {/* Competitor Areas */}
                  {competitors.map((competitor, index) => (
                    <Area 
                      key={competitor.domain}
                      type="monotone" 
                      dataKey={competitor.domain} 
                      name={competitor.domain}
                      stroke={getCompetitorColor(competitor.domain, index)} 
                      fillOpacity={1} 
                      fill={`url(#color${competitor.domain.replace(/[^a-zA-Z0-9]/g, '')})`} 
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Quick competitor toggles */}
            {competitors.length > 0 && !showOnlyYours && (
              <div className="mb-4">
                <div className="text-sm font-medium text-muted-foreground mb-2">Quick toggles:</div>
                <div className="flex flex-wrap gap-2">
                  {competitors.map((competitor, _index) => {
                    const isVisible = selectedCompetitors.length === 0 || selectedCompetitors.includes(competitor.domain);
                    return (
                      <Button
                        key={competitor.domain}
                        variant={isVisible ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (selectedCompetitors.length === 0) {
                            // If none selected, hide this one (select all others)
                            setSelectedCompetitors(competitors.filter(c => c.domain !== competitor.domain).map(c => c.domain));
                          } else if (selectedCompetitors.includes(competitor.domain)) {
                            // Remove from selection
                            setSelectedCompetitors(selectedCompetitors.filter(c => c !== competitor.domain));
                          } else {
                            // Add to selection
                            setSelectedCompetitors([...selectedCompetitors, competitor.domain]);
                          }
                        }}
                      >
                        {isVisible ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                        {getDisplayNameLocal(competitor.domain)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show filter info if active */}
            {(filterOutliers || selectedCompetitors.length > 0 || showOnlyYours) && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">
                  Active filters:
                  {filterOutliers && <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs">Outliers filtered</span>}
                  {showOnlyYours && <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs">Your price only</span>}
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
                      setShowOnlyYours(false);
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
            
            <div className={`mt-5 grid gap-4 text-center text-sm ${competitors.length > 3 ? 'grid-cols-2 lg:grid-cols-4' : `grid-cols-${Math.min(competitors.length + 1, 4)}`}`}>
              <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
                <div className="font-semibold">Your Avg</div>
                <div className="text-lg font-bold text-[#7728f8]">
                  ${averageYourPrice >= 1000 ? `${(averageYourPrice / 1000).toFixed(1)}k` : averageYourPrice}
                </div>
              </div>
              {competitorAverages
                .filter(comp => !showOnlyYours && (selectedCompetitors.length === 0 || selectedCompetitors.includes(comp.domain)))
                .slice(0, 3)
                .map((comp, index) => (
                <div key={comp.domain} className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
                  <div className="font-semibold" title={getFullName(comp.domain)}>
                    {getDisplayNameLocal(comp.domain)}
                  </div>
                  <div className="text-lg font-bold" style={{ color: getCompetitorColor(comp.domain, index) }}>
                    ${comp.average >= 1000 ? `${(comp.average / 1000).toFixed(1)}k` : comp.average}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="mx-auto h-10 w-10 mb-4" />
              <p>No pricing data available yet</p>
              <p className="text-sm mt-2">Add competitors to start tracking pricing trends</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
