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

export function PricingTrends() {
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
          <Select defaultValue="wireless-headphones">
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wireless-headphones">Wireless Headphones</SelectItem>
              <SelectItem value="bluetooth-speaker">Bluetooth Speaker</SelectItem>
              <SelectItem value="smart-watch">Smart Watch</SelectItem>
              <SelectItem value="usb-cable">USB-C Cable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorAmazon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF9900" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF9900" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWalmart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071DC" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0071DC" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEbay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53238" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#E53238" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorYourPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7728f8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7728f8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(value) => `$${value}`}
              />
              <RechartsTooltip 
                formatter={(value: number | string) => [`$${value}`, '']}
                labelFormatter={(label) => `${label} 2023`}
              />
              <Legend />
              
              {/* Add reference lines for averages */}
              <ReferenceLine y={averageYourPrice} stroke="#7728f8" strokeDasharray="3 3" label="Your Avg" />
              <ReferenceLine y={30} stroke="#E53238" strokeDasharray="3 3" label="Min Price" />
              
              <Area 
                type="monotone" 
                dataKey="Amazon" 
                stroke="#FF9900" 
                fillOpacity={1} 
                fill="url(#colorAmazon)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="Walmart" 
                stroke="#0071DC" 
                fillOpacity={1} 
                fill="url(#colorWalmart)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="eBay" 
                stroke="#E53238" 
                fillOpacity={1} 
                fill="url(#colorEbay)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="YourPrice" 
                stroke="#7728f8" 
                fillOpacity={1} 
                fill="url(#colorYourPrice)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-5 grid grid-cols-4 gap-4 text-center text-sm">
          <div className="rounded-md border p-2">
            <div className="font-semibold">Your Avg:</div>
            <div className="text-lg">${averageYourPrice}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="font-semibold">Amazon Avg:</div>
            <div className="text-lg">${averageAmazon}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="font-semibold">Walmart Avg:</div>
            <div className="text-lg">${averageWalmart}</div>
          </div>
          <div className="rounded-md border p-2">
            <div className="font-semibold">eBay Avg:</div>
            <div className="text-lg">${averageEbay}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
