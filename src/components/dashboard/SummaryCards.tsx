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

    return { significantChanges, changePercentage };
  };

  const { significantChanges, changePercentage } = calculatePriceChanges();

  // Calculate data quality based on actual data completeness
  const calculateDataQuality = () => {
    let totalDataPoints = 0;
    let completeDataPoints = 0;

    competitors.forEach(competitor => {
      competitor.products.forEach(product => {
        totalDataPoints++;
        // Check if product has complete pricing data
        if (product.price !== null && product.price > 0 && product.currency) {
          completeDataPoints++;
        }
      });
    });

    return totalDataPoints > 0 ? Math.round((completeDataPoints / totalDataPoints) * 100) : 100;
  };

  const dataQuality = calculateDataQuality();

  // Calculate performance score based on competitive positioning
  const calculatePerformanceScore = () => {
    if (!productsData || totalMatches === 0) return 0;

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

    return totalComparisons > 0 ? Math.round((competitiveAdvantages / totalComparisons) * 100) : 50;
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
          <div className="text-2xl font-bold">{significantChanges} Changes</div>
          <CardDescription className="flex items-center">
            <span className={`font-medium ${parseFloat(changePercentage) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changePercentage}
            </span>
            <span className="ml-1">vs competitors</span>
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            Looking at {totalMatches} similar products
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{dataQuality}%</div>
          <CardDescription>
            {dataQuality >= 90 ? 'Great data quality!' : 
             dataQuality >= 70 ? 'Good data completeness' : 
             'Data completeness'}
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            {competitors.filter(c => c.dataGaps.length === 0).length}/{totalCompetitors} complete profiles
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Market Strength</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{performanceScore}/100</div>
          <CardDescription>
            {performanceScore >= 70 ? 'Strong competitive position' :
             performanceScore >= 50 ? 'Competitive position' :
             'Room for improvement'}
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            {productsData ? `Based on ${productsData.length} product comparisons` : 'Performance score'}
          </p>
        </CardContent>
      </Card>
    </>
  );
} 