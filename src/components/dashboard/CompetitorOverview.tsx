'use client';

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { ArrowUpRight, ArrowDown, ShoppingCart, Store, Truck, Globe, AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

function CompetitorOverviewSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[160px] mb-2" />
        <Skeleton className="h-4 w-[200px]" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
              <Skeleton className="h-4 w-[40px]" />
            </div>
            <Skeleton className="h-2 w-full" />
            <div className="flex justify-between text-xs">
              <Skeleton className="h-3 w-[60px]" />
              <Skeleton className="h-3 w-[40px]" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CompetitorOverview() {
  const { data, isLoading, error } = api.competitor.get.useQuery();

  if (isLoading) {
    return <CompetitorOverviewSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Competitor Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-6 w-6 mb-2" />
            <p className="text-sm">Unable to load competitor data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { competitors } = data;

  if (competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Competitor Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Globe className="mx-auto h-8 w-8 mb-4" />
            <p className="text-sm">No competitors added yet</p>
            <p className="text-xs mt-1">Add competitors to see platform analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform competitor data into platform metrics
  const platformMetrics = competitors.slice(0, 3).map((competitor, index) => {
    const totalProducts = competitor.products.length;
    const matchedProducts = competitor.products.reduce((acc, product) => 
      acc + product.matchedProducts.length, 0);
    const progress = totalProducts > 0 ? Math.round((matchedProducts / totalProducts) * 100) : 0;
    
    // Generate some trend data (mock for now)
    const trend = Math.floor(Math.random() * 10) - 5; // Random trend between -5 and 5
    
    // Get platform icon based on domain
    const getIcon = (domain: string) => {
      if (domain.includes('amazon')) return <ShoppingCart size={16} />;
      if (domain.includes('walmart') || domain.includes('shop')) return <Store size={16} />;
      if (domain.includes('ebay') || domain.includes('marketplace')) return <Truck size={16} />;
      return <Globe size={16} />;
    };

    // Get platform color based on domain
    const getColor = (domain: string) => {
      if (domain.includes('amazon')) return "bg-[#FF9900]/10 text-[#FF9900]";
      if (domain.includes('walmart')) return "bg-[#0071DC]/10 text-[#0071DC]";
      if (domain.includes('ebay')) return "bg-[#E53238]/10 text-[#E53238]";
      return "bg-muted/10 text-muted-foreground";
    };

    return {
      name: competitor.domain,
      icon: getIcon(competitor.domain),
      color: getColor(competitor.domain),
      products: matchedProducts,
      totalProducts: totalProducts,
      progress: Math.min(progress, 100),
      trend: trend,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Overview</CardTitle>
        <p className="text-sm text-muted-foreground">
          Product coverage across competitor platforms
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {platformMetrics.map((platform, index) => (
          <div key={platform.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`rounded p-1 ${platform.color}`}>
                  {platform.icon}
                </div>
                <span className="font-medium text-sm">{platform.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {platform.trend > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : platform.trend < 0 ? (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                ) : null}
                <span className={
                  platform.trend > 0 
                    ? "text-green-500" 
                    : platform.trend < 0 
                      ? "text-red-500" 
                      : "text-muted-foreground"
                }>
                  {platform.trend > 0 ? '+' : ''}{platform.trend}%
                </span>
              </div>
            </div>
            <Progress value={platform.progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{platform.products} matches found</span>
              <span>{platform.progress}% coverage</span>
            </div>
          </div>
        ))}
        
        {competitors.length > 3 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              +{competitors.length - 3} more competitor{competitors.length - 3 !== 1 ? 's' : ''} tracked
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
