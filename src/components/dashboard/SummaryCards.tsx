'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DollarSign, Store, TrendingUp, Target, Users, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[60px] mb-2" />
        <Skeleton className="h-4 w-[100px] mb-2" />
        <Skeleton className="h-3 w-[140px]" />
      </CardContent>
    </Card>
  );
}

export function SummaryCards() {
  const { data, isLoading, error } = api.competitor.get.useQuery();

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Error</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <CardDescription>Unable to load data</CardDescription>
            </CardContent>
          </Card>
        ))}
      </>
    );
  }

  const { competitors } = data;

  // Calculate metrics from real data
  const totalCompetitors = competitors.length;
  const avgMatchScore = totalCompetitors > 0
    ? Math.round(competitors.reduce((acc, comp) => acc + comp.matchScore, 0) / totalCompetitors)
    : 0;

  const totalProducts = competitors.reduce((acc, comp) => acc + comp.products.length, 0);
  const totalMatches = competitors.reduce((acc, comp) => 
    acc + comp.products.reduce((prodAcc, prod) => prodAcc + prod.matchedProducts.length, 0), 0);

  // Get unique platforms/sources where competitors were found
  const uniquePlatforms = new Set(competitors.map(c => c.domain));

  // Calculate market coverage (percentage of competitors with complete data)
  const marketCoverage = totalCompetitors > 0
    ? Math.round((competitors.filter(c => c.dataGaps.length === 0).length / totalCompetitors) * 100)
    : 0;

  // Calculate price changes (mock for now, but structure for real data)
  const priceChanges = 5; // TODO: Replace with actual price change tracking
  const priceChangePercentage = "+2.3%"; // TODO: Calculate from real price history

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCompetitors}</div>
          <CardDescription>Total competitors monitored</CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">
            Found on {uniquePlatforms.size} different website{uniquePlatforms.size !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Price Analysis</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{priceChanges} Changes</div>
          <CardDescription>{priceChangePercentage} vs Competitors</CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">
            Looking at {totalMatches} similar product{totalMatches !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{marketCoverage}%</div>
          <CardDescription>Data completeness</CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">
            {marketCoverage > 80 ? 'Great data quality!' : marketCoverage > 50 ? 'Good data quality' : 'Still gathering info'}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Market Strength</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgMatchScore}/100</div>
          <CardDescription>Performance score</CardDescription>
          <div className={cn("mt-2 text-xs", avgMatchScore >= 70 ? "text-green-600" : avgMatchScore >= 50 ? "text-yellow-600" : "text-red-600")}>
            {avgMatchScore >= 80 ? "Market leader!" : avgMatchScore >= 70 ? "Strong performance" : avgMatchScore >= 50 ? "Good position" : "Room for improvement"}
          </div>
        </CardContent>
      </Card>
    </>
  );
} 