'use client';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "~/components/ui/select";

// Sample data
const data = [
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
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Pricing Trends</CardTitle>
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
              <Tooltip 
                formatter={(value: number | string) => [`$${value}`, '']}
                labelFormatter={(label) => `${label} 2023`}
              />
              <Legend />
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
      </CardContent>
    </Card>
  );
}
