'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowDown, ArrowUp, Clock, Info, AlertTriangle, TrendingUp, TrendingDown, Globe } from "lucide-react";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

interface AlertProps {
  id: string;
  timestamp: string;
  productName: string;
  marketplace: string;
  message: string;
  priceChange?: {
    oldPrice: string;
    newPrice: string;
    percentage: number;
  };
  type: "price-drop" | "price-increase" | "notification" | "warning" | "insight";
}

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
    case "insight":
      return <TrendingUp className="h-5 w-5 text-purple-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

function RecentAlertsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-[120px] mb-2" />
            <Skeleton className="h-4 w-[180px]" />
          </div>
          <Skeleton className="h-6 w-[60px]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-lg border">
              <Skeleton className="h-5 w-5 mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[80px]" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-[120px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentAlerts() {
  const { data, isLoading, error } = api.competitor.get.useQuery();

  if (isLoading) {
    return <RecentAlertsSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Alerts</CardTitle>
          <CardDescription>Price changes and notifications</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
            <p className="text-sm">Unable to load alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { competitors, insights } = data;

  // Generate alerts from insights and competitor data
  const alerts: AlertProps[] = [];

  // Add insights as alerts
  insights.forEach((insight, index) => {
    alerts.push({
      id: `insight-${index}`,
      timestamp: "Today",
      productName: insight.product,
      marketplace: "Analysis",
      message: insight.message,
      type: insight.recommendation === "increase" ? "price-increase" : "price-drop",
    });
  });

  // Add competitor-based alerts
  competitors.forEach((competitor, compIndex) => {
    competitor.products.forEach((product, prodIndex) => {
      if (product.matchedProducts.length > 0) {
        const avgPriceDiff = product.matchedProducts.reduce((acc, match) => 
          acc + (match.priceDiff ?? 0), 0) / product.matchedProducts.length;
        
        if (Math.abs(avgPriceDiff) > 5) {
          alerts.push({
            id: `competitor-${compIndex}-${prodIndex}`,
            timestamp: "Today",
            productName: product.name,
            marketplace: competitor.domain,
            message: avgPriceDiff > 0 
              ? `Your price is ${avgPriceDiff.toFixed(1)}% higher than ${competitor.domain}`
              : `${competitor.domain} is ${Math.abs(avgPriceDiff).toFixed(1)}% higher than your price`,
            type: avgPriceDiff > 0 ? "warning" : "notification",
          });
        }
      }
    });
  });

  // Add some general notifications if no specific alerts
  if (alerts.length === 0) {
    if (competitors.length > 0) {
      alerts.push({
        id: "general-1",
        timestamp: "Today",
        productName: "Market Analysis",
        marketplace: "All Platforms",
        message: `Monitoring ${competitors.length} competitor${competitors.length !== 1 ? 's' : ''} across your product catalog`,
        type: "notification",
      });
    }

    alerts.push({
      id: "general-2",
      timestamp: "Today",
      productName: "System Status",
      marketplace: "Sagelytics",
      message: competitors.length === 0 
        ? "Add competitors to start receiving price alerts and insights"
        : "All monitoring systems are operational",
      type: competitors.length === 0 ? "warning" : "notification",
    });
  }

  // Limit to most recent 4 alerts
  const recentAlerts = alerts.slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Recent Alerts</CardTitle>
            <CardDescription>Price changes and insights</CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto">
            {recentAlerts.length} {recentAlerts.length === 1 ? 'Alert' : 'Alerts'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {recentAlerts.length > 0 ? (
          <div className="space-y-4">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="mt-1">
                  <AlertIcon type={alert.type} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{alert.productName}</h4>
                    <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {alert.marketplace}
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
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Globe className="mx-auto h-8 w-8 mb-4" />
              <p className="text-sm">No recent alerts</p>
              <p className="text-xs mt-1">Alerts will appear here when price changes are detected</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
