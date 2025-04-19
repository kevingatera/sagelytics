'use client';

import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Users,
  LineChart,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import type { CompetitorBase } from '~/lib/types/dashboard';
import { cn } from '~/lib/utils';

interface StatsCardsProps {
  competitors: CompetitorBase[];
}

export function StatsCards({ competitors }: StatsCardsProps) {
  // Calculate average match score
  const avgMatchScore =
    competitors.length > 0
      ? Math.round(competitors.reduce((acc, comp) => acc + comp.matchScore, 0) / competitors.length)
      : 0;

  // Calculate total monitored products
  const totalProducts = competitors.reduce((acc, comp) => acc + comp.products.length, 0);

  // Calculate price positioning - Guard against NaN
  const calculatePricePositioning = (): number => {
    if (competitors.length === 0) {
      return 1; // Default to 'Same as' if no competitors
    }

    let totalRatioSum = 0;
    let validCompetitors = 0;

    for (const comp of competitors) {
      if (comp.products.length === 0) continue;

      const competitorProductsWithPrice = comp.products.filter(p => p.price !== null && p.price > 0);
      if (competitorProductsWithPrice.length === 0) continue;

      // Calculate average price difference ratio for this competitor
      let competitorSumOfAvgMatchedPriceRatios = 0;
      let productsWithMatchesCount = 0;

      for (const p of comp.products) {
        // Access the inner matchedProducts array for priceDiff
        const matchesWithPriceDiff = p.matchedProducts.flatMap(match => match.matchedProducts)
                                        .filter(innerMatch => innerMatch.priceDiff !== null);

        if (matchesWithPriceDiff.length > 0) {
          const sumMatchedDiffs = matchesWithPriceDiff.reduce((mSum, m) => mSum + m.priceDiff!, 0);
          const avgMatchedPriceDiff = sumMatchedDiffs / matchesWithPriceDiff.length;

          // Calculate the ratio: (Competitor Price + Avg Diff) / Competitor Price
          // This assumes priceDiff is the absolute difference to add to competitor price
          // If p.price is null, we skip this product for ratio calculation
          if (p.price !== null && p.price > 0) {
             // Use competitor product's price (p.price) as the base for the ratio
            const estimatedUserPrice = p.price + avgMatchedPriceDiff;
            const priceRatio = estimatedUserPrice / p.price;
            competitorSumOfAvgMatchedPriceRatios += priceRatio;
            productsWithMatchesCount++;
          }
        }
      }

      if (productsWithMatchesCount === 0) continue; // No valid price diff data for this competitor

      // Average ratio for the competitor across its products with matches
      const avgRatioForCompetitor = competitorSumOfAvgMatchedPriceRatios / productsWithMatchesCount;

      if (!isNaN(avgRatioForCompetitor) && isFinite(avgRatioForCompetitor)) {
        totalRatioSum += avgRatioForCompetitor;
        validCompetitors++;
      }
    }

    if (validCompetitors === 0) {
      return 1; // Default if no valid data found across competitors
    }

    return totalRatioSum / validCompetitors;
  };

  const pricePositioning = calculatePricePositioning();

  // Calculate market coverage (percentage of competitors with complete data)
  const marketCoverage =
    competitors.length > 0
      ? Math.round(
          (competitors.filter((c) => c.dataGaps.length === 0).length / competitors.length) * 100,
        )
      : 0;

  // Get unique platforms
  const uniquePlatforms = new Set(
    competitors
      .filter(
        (c): c is CompetitorBase & { metadata?: { platforms?: { platform: string }[] } } =>
          'metadata' in c,
      )
      .flatMap((c) => c.metadata?.platforms?.map((p) => p.platform) ?? []),
  );

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Found Competitors</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Companies we&apos;ve found that sell similar products or services to yours</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitors.length}</div>
            <p className="text-xs text-muted-foreground">
              {competitors.length > 0
                ? `Found on ${uniquePlatforms.size} different websites`
                : 'Add your first competitor to get started'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How complete our data is about your competitors. Higher is better!</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketCoverage}%</div>
            <p className="text-xs text-muted-foreground">
              {marketCoverage > 80
                ? 'We have great data about your market!'
                : 'Still gathering more info'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Your Prices vs Market</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>How your prices compare to similar products from competitors</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold">
                {pricePositioning > 1
                  ? 'Higher than'
                  : pricePositioning < 1
                    ? 'Lower than'
                    : 'Same as'}{' '}
                competitors
              </div>
              {/* Ensure NaN is not displayed */}
              {!isNaN(pricePositioning) && pricePositioning !== 1 && (
                <span
                  className={cn(
                    'ml-2 flex items-center',
                    pricePositioning > 1 ? 'text-red-500' : 'text-green-500',
                  )}
                >
                  {Math.abs((pricePositioning - 1) * 100).toFixed(1)}%
                  {pricePositioning > 1 ? (
                    <ArrowUpRight className="inline h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="inline h-4 w-4" />
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Looking at {totalProducts} similar products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Market Strength</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Overall score showing how well you&apos;re competing in your market</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMatchScore}/100</div>
            <p className="text-xs text-muted-foreground">
              {avgMatchScore >= 80
                ? "You're leading your market! 🎉"
                : avgMatchScore >= 60
                  ? 'Strong performance!'
                  : avgMatchScore >= 40
                    ? 'Getting there - room to grow'
                    : "Let's work on improving this"}
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
