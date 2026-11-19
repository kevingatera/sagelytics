'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowDown, ArrowUp, Clock, AlertTriangle, Globe } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import type { DashboardAlert } from "~/app/api/price-history/dashboard/summary";
import { usePriceDashboard } from "./usePriceDashboard";

const NOTIFICATION_LABELS: Record<string, string> = {
  sent: "Emailed",
  failed: "Email failed",
  skipped: "Email off",
};

const AlertIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "price_decrease":
      return <ArrowDown className="h-5 w-5 text-green-500" />;
    case "price_increase":
      return <ArrowUp className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

function describeAlert(alert: DashboardAlert): string {
  const size = alert.thresholdValue === null ? "" : ` ${alert.thresholdValue}%`;
  switch (alert.alertType) {
    case "price_increase":
      return `Competitor price rose${size}`;
    case "price_decrease":
      return `Competitor price fell${size}`;
    default:
      return "Price alert";
  }
}

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
  const { data, isLoading, error } = usePriceDashboard(90);

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

  const alerts = data.alerts.slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Recent Alerts</CardTitle>
            <CardDescription>Competitor price moves past the alert threshold</CardDescription>
          </div>
          <Badge variant="outline" className="ml-auto whitespace-nowrap">
            {alerts.length} {alerts.length === 1 ? 'Alert' : 'Alerts'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <div className="mt-1">
                  <AlertIcon type={alert.alertType} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm truncate">
                      {alert.productName ?? alert.competitorDomain ?? "Competitor"}
                    </h4>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {describeAlert(alert)}
                    {alert.productName && alert.competitorDomain ? ` on ${alert.competitorDomain}` : ""}
                  </p>
                  {alert.productUrl && (
                    <a
                      href={alert.productUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="block text-xs text-primary hover:underline truncate"
                    >
                      {alert.productUrl}
                    </a>
                  )}
                  {alert.notificationStatus && (
                    <div className="flex items-center justify-end">
                      <span className="text-xs text-muted-foreground">
                        {NOTIFICATION_LABELS[alert.notificationStatus] ?? alert.notificationStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Globe className="mx-auto h-8 w-8 mb-4" />
              <p className="text-sm">No price alerts yet</p>
              <p className="text-xs mt-1">Alerts appear when a monitored competitor price moves 10% or more between checks</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
