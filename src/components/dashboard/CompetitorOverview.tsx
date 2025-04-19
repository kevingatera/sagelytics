'use client';

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { ArrowUpRight, ArrowDown, ShoppingCart, Store, Truck } from "lucide-react";

const platforms = [
  {
    name: "Amazon",
    icon: <ShoppingCart size={16} />,
    color: "bg-[#FF9900]/10 text-[#FF9900]",
    products: 42,
    totalProducts: 50,
    progress: 84,
    trend: 5,
  },
  {
    name: "Walmart",
    icon: <Store size={16} />,
    color: "bg-[#0071DC]/10 text-[#0071DC]",
    products: 38,
    totalProducts: 50,
    progress: 76,
    trend: -2,
  },
  {
    name: "eBay",
    icon: <Truck size={16} />,
    color: "bg-[#E53238]/10 text-[#E53238]",
    products: 31,
    totalProducts: 50,
    progress: 62,
    trend: 3,
  }
];

export function CompetitorOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Platform Coverage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {platforms.map((platform) => (
            <div key={platform.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-md ${platform.color}`}>
                    {platform.icon}
                  </span>
                  <span className="font-medium">{platform.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {platform.products}/{platform.totalProducts}
                  </span>
                  <span className={platform.trend > 0 ? "text-success text-xs" : "text-danger text-xs"}>
                    {platform.trend > 0 ? (
                      <span className="flex items-center">
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        {platform.trend}%
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <ArrowDown className="h-3 w-3 mr-1" />
                        {Math.abs(platform.trend)}%
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <Progress value={platform.progress} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
