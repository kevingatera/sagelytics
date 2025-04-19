'use client';

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Users as UsersIcon, Info, LineChart, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

function StatCard({ 
  title, 
  value, 
  subtext, 
  icon, 
  trend = "neutral",
  tooltipText 
}: { 
  title: string; 
  value: string; 
  subtext: string; 
  icon: React.ReactNode; 
  trend?: "up" | "down" | "neutral";
  tooltipText?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          {title}
          {tooltipText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <div className="rounded-full p-1.5 bg-muted/50">{icon}</div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend === "up" && <ArrowUpIcon className="h-3 w-3 text-emerald-500" />}
          {trend === "down" && <ArrowDownIcon className="h-3 w-3 text-red-500" />}
          <span className={
            trend === "up" 
              ? "text-xs text-emerald-500" 
              : trend === "down" 
                ? "text-xs text-red-500" 
                : "text-xs text-muted-foreground"
          }>
            {subtext}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformMetrics() {
  return (
    <>
      <StatCard
        title="Found Competitors"
        value="1"
        subtext="Found on 0 different websites"
        icon={<UsersIcon className="h-4 w-4" />}
        tooltipText="Number of competitors found and being actively monitored across all websites"
      />
      <StatCard
        title="Data Quality"
        value="0%"
        subtext="Still gathering more info"
        icon={<Info className="h-4 w-4" />}
        tooltipText="Percentage of competitor data that has been successfully gathered and validated"
      />
      <StatCard
        title="Price Comparison"
        value="Same as competitors"
        subtext="Looking at 31 similar products"
        icon={<LineChart className="h-4 w-4" />}
        tooltipText="How your product prices compare to market averages across all competitors"
      />
      <StatCard
        title="Market Strength"
        value="75/100"
        subtext="Strong performance!"
        icon={<Zap className="h-4 w-4" />}
        trend="up"
        tooltipText="Overall market performance score based on pricing strategy, competitor analysis, and market share"
      />
    </>
  );
}
