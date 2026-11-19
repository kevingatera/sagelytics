'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DollarSign, Store, TrendingUp, Target, Users, HelpCircle, Activity } from "lucide-react";
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
  const { data: productsData } = api.competitor.getProducts.useQuery();

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
        {['Competitors Tracked', 'Price Analysis', 'Competitor profiles', 'Cheaper than rivals'].map((title) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
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

  const completeProfiles = competitors.filter(c => c.dataGaps.length === 0).length;

  // Calculate actual price changes from competitor data
  const calculatePriceChanges = () => {
    let significantChanges = 0;
    let totalPriceDiff = 0;
    let changeCount = 0;

    competitors.forEach(competitor => {
      competitor.products.forEach(product => {
        product.matchedProducts.forEach(match => {
          if (match.priceDiff !== null && match.priceDiff !== undefined) {
            const absDiff = Math.abs(match.priceDiff);
            if (absDiff > 5) { // Consider >5% as significant change
              significantChanges++;
            }
            totalPriceDiff += match.priceDiff;
            changeCount++;
          }
        });
      });
    });

    const avgPriceChange = changeCount > 0 ? totalPriceDiff / changeCount : 0;
    const changePercentage = avgPriceChange > 0 ? `+${avgPriceChange.toFixed(1)}%` : `${avgPriceChange.toFixed(1)}%`;

    return { significantChanges, changePercentage, changeCount };
  };

  const { significantChanges, changePercentage, changeCount } = calculatePriceChanges();

  // Calculate performance score based on competitive positioning
  const calculatePerformanceScore = () => {
    if (!productsData || totalMatches === 0) return null;

    let competitiveAdvantages = 0;
    let totalComparisons = 0;

    productsData.forEach(userProduct => {
      userProduct.competitors.forEach(competitor => {
        totalComparisons++;
        // User has advantage if competitor price is higher (positive difference)
        if (competitor.difference > 0) {
          competitiveAdvantages++;
        }
      });
    });

    return totalComparisons > 0 ? Math.round((competitiveAdvantages / totalComparisons) * 100) : null;
  };

  const performanceScore = calculatePerformanceScore();

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCompetitors}</div>
          <CardDescription>
            {uniquePlatforms.size > 1 
              ? `Found on ${uniquePlatforms.size} different websites`
              : 'Total competitors monitored'
            }
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            {totalProducts} products • {totalMatches} matches found
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Price Analysis</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {changeCount > 0 ? (
            <>
              <div className="text-2xl font-bold">
                {significantChanges} price {significantChanges === 1 ? 'gap' : 'gaps'} over 5%
              </div>
              <CardDescription className="flex items-center">
                <span className="font-medium">{changePercentage}</span>
                <span className="ml-1">avg. competitor price vs yours (+ = competitor higher)</span>
              </CardDescription>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">--</div>
              <CardDescription>No price comparisons yet</CardDescription>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Compared with {totalMatches} similar products
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Competitor profiles</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completeProfiles} of {totalCompetitors}</div>
          <CardDescription>
            {totalCompetitors === 0 ? 'Nothing to count yet' : 'Profiles with complete data'}
          </CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Cheaper than rivals</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{performanceScore === null ? '--' : `${performanceScore}%`}</div>
          <CardDescription>
            {performanceScore === null ? 'No matched products yet' :
             performanceScore >= 70 ? 'Most matched products are cheaper' :
             performanceScore >= 50 ? 'About half are cheaper' :
             'Rivals are often cheaper'}
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            {productsData ? `Based on ${productsData.length} of your products` : 'Share of your matched products'}
          </p>
        </CardContent>
      </Card>
    </>
  );
} 