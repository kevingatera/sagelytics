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
import type { TooltipProps } from 'recharts';

// Define data type
type DataPoint = {
  date: string;
  Amazon: number;
  Walmart: number;
  eBay: number;
  YourPrice: number;
  [key: string]: string | number; // Index signature for dynamic access
};

// Sample data
const data: DataPoint[] = [
  { date: 'Jan', Amazon: 30, Walmart: 35, eBay: 28, YourPrice: 32 },
  { date: 'Feb', Amazon: 32, Walmart: 36, eBay: 29, YourPrice: 35 },
  { date: 'Mar', Amazon: 35, Walmart: 37, eBay: 31, YourPrice: 36 },
  { date: 'Apr', Amazon: 38, Walmart: 35, eBay: 32, YourPrice: 38 },
  { date: 'May', Amazon: 37, Walmart: 34, eBay: 33, YourPrice: 40 },
  { date: 'Jun', Amazon: 36, Walmart: 37, eBay: 34, YourPrice: 39 },
  { date: 'Jul', Amazon: 34, Walmart: 38, eBay: 35, YourPrice: 37 },
  { date: 'Aug', Amazon: 35, Walmart: 39, eBay: 34, YourPrice: 38 },
  { date: 'Sep', Amazon: 37, Walmart: 40, eBay: 35, YourPrice: 40 },
  { date: 'Oct', Amazon: 39, Walmart: 38, eBay: 34, YourPrice: 41 },
  { date: 'Nov', Amazon: 40, Walmart: 37, eBay: 33, YourPrice: 42 },
  { date: 'Dec', Amazon: 41, Walmart: 36, eBay: 34, YourPrice: 43 },
];

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

export function PricingTrends() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Calculate average price for each competitor
  const calculateAverage = (competitor: string): number => {
    return Math.round(
      data.reduce((sum, item) => sum + (item[competitor] as number), 0) / data.length
    );
  };

  const averageYourPrice = calculateAverage('YourPrice');
  const averageAmazon = calculateAverage('Amazon');
  const averageWalmart = calculateAverage('Walmart');
  const averageEbay = calculateAverage('eBay');

  // Find min and max price points across all competitors
  const allPrices = data.flatMap(item => [
    item.Amazon, item.Walmart, item.eBay, item.YourPrice
  ]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

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
          <Select defaultValue="Amazon">
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Amazon">Amazon</SelectItem>
              <SelectItem value="Walmart">Walmart</SelectItem>
              <SelectItem value="eBay">eBay</SelectItem>
              <SelectItem value="YourPrice">YourPrice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorAmazon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9900" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FF9900" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWalmart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071DC" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0071DC" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEbay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53238" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E53238" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorYourPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7728f8" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#7728f8" stopOpacity={0} />
                </linearGradient>
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
                domain={[minPrice - 2, maxPrice + 2]}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ paddingTop: 15 }}
              />
              
              {/* Add reference lines for averages */}
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
              
              <Area 
                type="monotone" 
                dataKey="Amazon" 
                name="Amazon"
                stroke="#FF9900" 
                fillOpacity={1} 
                fill="url(#colorAmazon)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="Walmart" 
                name="Walmart"
                stroke="#0071DC" 
                fillOpacity={1} 
                fill="url(#colorWalmart)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="eBay" 
                name="eBay"
                stroke="#E53238" 
                fillOpacity={1} 
                fill="url(#colorEbay)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="YourPrice" 
                name="Your Price"
                stroke="#7728f8" 
                fillOpacity={1} 
                fill="url(#colorYourPrice)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-5 grid grid-cols-4 gap-4 text-center text-sm">
          <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
            <div className="font-semibold">Your Avg</div>
            <div className="text-lg font-bold text-[#7728f8]">${averageYourPrice}</div>
          </div>
          <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
            <div className="font-semibold">Amazon Avg</div>
            <div className="text-lg font-bold text-[#FF9900]">${averageAmazon}</div>
          </div>
          <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
            <div className="font-semibold">Walmart Avg</div>
            <div className="text-lg font-bold text-[#0071DC]">${averageWalmart}</div>
          </div>
          <div className="rounded-md border p-2 hover:bg-muted/50 transition-colors">
            <div className="font-semibold">eBay Avg</div>
            <div className="text-lg font-bold text-[#E53238]">${averageEbay}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
