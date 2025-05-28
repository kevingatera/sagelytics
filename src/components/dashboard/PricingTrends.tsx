'use client';

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
import { AlertCircle } from "lucide-react";
import type { TooltipProps } from 'recharts';

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
            <span style={{ color: entry.color }} className="text-sm font-medium mr-4">{entry.name}</span>
            <span className="text-sm font-semibold">${entry.value}</span>
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
  
  const { data, isLoading, error } = api.competitor.get.useQuery();

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
  const { competitors, priceData } = data;
  
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
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;

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
          <Tabs defaultValue="30d" className="w-[180px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="1y">1y</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitors</SelectItem>
              <SelectItem value="yours">Your Price Only</SelectItem>
              {competitors.map(competitor => (
                <SelectItem key={competitor.domain} value={competitor.domain}>
                  {competitor.domain}
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
                  data={chartData}
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
                    tickFormatter={(value) => `$${value}`}
                    stroke={isDark ? "#888" : "#666"}
                    tickLine={false}
                    axisLine={false}
                    domain={[Math.max(0, minPrice - 2), maxPrice + 2]}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend 
                    iconType="circle" 
                    wrapperStyle={{ paddingTop: 15 }}
                  />
                  
                  {/* Add reference line for your average */}
                  {averageYourPrice > 0 && (
                    <ReferenceLine 
                      y={averageYourPrice} 
                      stroke="#7728f8" 
                      strokeDasharray="3 3" 
                      strokeWidth={1.5}
                      label={{ 
                        value: `Your Avg: $${averageYourPrice}`,
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
            
            <div className={`mt-5 grid gap-4 text-center text-sm ${competitors.length > 3 ? 'grid-cols-2 lg:grid-cols-4' : `grid-cols-${Math.min(competitors.length + 1, 4)}`}`}>
              <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
                <div className="font-semibold">Your Avg</div>
                <div className="text-lg font-bold text-[#7728f8]">${averageYourPrice}</div>
              </div>
              {competitorAverages.slice(0, 3).map((comp, index) => (
                <div key={comp.domain} className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
                  <div className="font-semibold">{comp.domain}</div>
                  <div className="text-lg font-bold" style={{ color: getCompetitorColor(comp.domain, index) }}>
                    ${comp.average}
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
