import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { CompetitorLogo } from "~/components/competitors/CompetitorLogo";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { CompetitorBase, DashboardProduct, ProductMatch } from "@shared/types";

// Helper function to calculate average price difference
function calculateAvgPriceDiff(products: DashboardProduct[]): number {
  let totalAvgDiff = 0;
  let productsWithDiffs = 0;

  products.forEach((p: DashboardProduct) => {
    const diffs = p.matchedProducts
      .map((m: ProductMatch) => m.priceDiff)
      .filter((d): d is number => d !== null && d !== undefined);

    if (diffs.length > 0) {
      totalAvgDiff += diffs.reduce((a, b) => a + b, 0) / diffs.length;
      productsWithDiffs++;
    }
  });

  return productsWithDiffs > 0 ? totalAvgDiff / productsWithDiffs : 0;
}

// Helper function to determine overall price position
function determinePricePosition(products: DashboardProduct[]): "cheaper" | "higher" | "mixed" {
  let cheaperCount = 0;
  let higherCount = 0;

  products.forEach((p: DashboardProduct) => {
    const diffs = p.matchedProducts
      .map((m: ProductMatch) => m.priceDiff)
      .filter((d): d is number => d !== null && d !== undefined);
    
    if (diffs.length > 0) {
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      if (avg < -1) cheaperCount++;
      if (avg > 1) higherCount++;
    }
  });

  if (cheaperCount > 0 && higherCount === 0) return "cheaper";
  if (higherCount > 0 && cheaperCount === 0) return "higher";
  return "mixed";
}

export const CompetitorCardSkeleton = () => (
  <Card className="h-[200px]">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <Skeleton className="h-6 w-8 mx-auto" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <Skeleton className="h-6 w-8 mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <Skeleton className="h-6 w-8 mx-auto" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      </div>
    </CardContent>
    <CardFooter className="pt-0">
      <Skeleton className="h-9 w-full" />
    </CardFooter>
  </Card>
);

export const ModernCompetitorCard = ({ competitor, onDelete, deleting }: { competitor: CompetitorBase, onDelete: (domain: string) => void, deleting: boolean }) => {
  const totalMatches = competitor.products.reduce((acc, prod) => acc + prod.matchedProducts.length, 0);
  const avgPriceDiff = calculateAvgPriceDiff(competitor.products);
  const pricePosition = determinePricePosition(competitor.products);
  
  const getPricePositionColor = (position: string) => {
    switch (position) {
      case "cheaper": return "text-red-500";
      case "higher": return "text-green-500";
      default: return "text-yellow-500";
    }
  };

  const getPricePositionBadge = (position: string) => {
    switch (position) {
      case "cheaper": return { label: "Lower Priced", variant: "destructive" as const };
      case "higher": return { label: "Higher Priced", variant: "default" as const, className: "bg-green-500 hover:bg-green-600" };
      default: return { label: "Mixed Pricing", variant: "secondary" as const };
    }
  };

  const badgeInfo = getPricePositionBadge(pricePosition);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <CompetitorLogo domain={competitor.domain} />
              {competitor.dataGaps.length > 0 && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight truncate">{competitor.domain}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {competitor.products.length} products • {competitor.matchScore}% match
              </p>
            </div>
          </div>
          <button
            className="ml-2 p-1 rounded hover:bg-destructive/10 text-destructive"
            onClick={() => onDelete(competitor.domain)}
            disabled={deleting}
            aria-label="Remove competitor"
            type="button"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2">
          <Badge variant={badgeInfo.variant} className={`text-xs ${badgeInfo.className ?? ''}`}>
            {badgeInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold">{totalMatches}</div>
            <div className="text-xs text-muted-foreground">Matches</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${getPricePositionColor(pricePosition)}`}>
              {avgPriceDiff > 0 ? '+' : ''}{avgPriceDiff.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg. Diff</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              {competitor.dataGaps.length === 0 ? '✓' : competitor.dataGaps.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {competitor.dataGaps.length === 0 ? 'Complete' : 'Gaps'}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 mt-auto">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          asChild
        >
          <a href={`${competitor.domain}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3 mr-2" />
            Visit Site
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}; 