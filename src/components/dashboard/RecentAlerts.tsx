'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowDown, ArrowUp, Clock, Info, AlertTriangle } from "lucide-react";

interface AlertProps {
  id: string;
  timestamp: string;
  productName: string;
  productSku: string;
  marketplace: string;
  message: string;
  priceChange?: {
    oldPrice: string;
    newPrice: string;
    percentage: number;
  };
  type: "price-drop" | "price-increase" | "notification" | "warning";
}

const alerts: AlertProps[] = [
  {
    id: "alert-1",
    timestamp: "Today, 11:32 AM",
    productName: "Wireless Noise-Cancelling Headphones",
    productSku: "WH-1000XM4",
    marketplace: "Amazon",
    message: "Competitor price decreased by 15%",
    priceChange: {
      oldPrice: "$348.99",
      newPrice: "$296.64",
      percentage: -15,
    },
    type: "price-drop",
  },
  {
    id: "alert-2",
    timestamp: "Today, 09:15 AM",
    productName: "Smart Watch Series 7",
    productSku: "SW-S7-44MM",
    marketplace: "Walmart",
    message: "Your price is now 8% higher than marketplace average",
    priceChange: {
      oldPrice: "$399.99",
      newPrice: "$429.99",
      percentage: 8,
    },
    type: "price-increase",
  },
  {
    id: "alert-3",
    timestamp: "Yesterday, 4:23 PM",
    productName: "Bluetooth Portable Speaker",
    productSku: "BT-SPK-450",
    marketplace: "All",
    message: "Stock level is below threshold (5 units remaining)",
    type: "warning",
  },
  {
    id: "alert-4",
    timestamp: "Yesterday, 10:42 AM",
    productName: "USB-C Fast Charging Cable",
    productSku: "CC-100W-2M",
    marketplace: "All",
    message: "New pricing strategy recommendation available",
    type: "notification",
  },
];

const AlertIcon = ({ type }: { type: AlertProps["type"] }) => {
  switch (type) {
    case "price-drop":
      return <ArrowDown className="h-5 w-5 text-green-500" />;
    case "price-increase":
      return <ArrowUp className="h-5 w-5 text-red-500" />;
    case "notification":
      return <Info className="h-5 w-5 text-blue-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

export function RecentAlerts() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Recent Alerts</CardTitle>
            <CardDescription>Price changes and notifications</CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto">
            {alerts.length} New
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg border">
              <div className="mt-1">
                <AlertIcon type={alert.type} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{alert.productName}</h4>
                  <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    SKU: {alert.productSku} • {alert.marketplace}
                  </span>
                  {alert.priceChange && (
                    <span className={`text-sm font-medium ${alert.priceChange.percentage < 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {alert.priceChange.oldPrice} → {alert.priceChange.newPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
