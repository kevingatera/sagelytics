import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { CompetitorLogo } from "~/components/competitors/CompetitorLogo";
import { 
  ExternalLink, 
  Trash2, 
  Package, 
  MoreHorizontal, 
  Eye,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "~/components/ui/tooltip";
import Link from "next/link";
import { cn } from "~/lib/utils";
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

// Helper function to get time since last analysis
function getTimeSinceLastAnalysis(metadata?: { lastAnalyzed?: string }): string {
  if (!metadata?.lastAnalyzed) return "Never";
  
  const lastAnalyzed = new Date(metadata.lastAnalyzed);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - lastAnalyzed.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w ago`;
}

export const CompetitorCardSkeleton = () => (
  <Card className="h-[280px]">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
        </div>
        <Skeleton className="h-8 w-8" />
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
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </CardContent>
    <CardFooter className="pt-0 space-y-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </CardFooter>
  </Card>
);

export const ModernCompetitorCard = ({ 
  competitor, 
  onDelete, 
  deleting 
}: { 
  competitor: CompetitorBase, 
  onDelete: (domain: string) => void, 
  deleting: boolean 
}) => {
  const totalMatches = competitor.products.reduce((acc, prod) => acc + prod.matchedProducts.length, 0);
  const avgPriceDiff = calculateAvgPriceDiff(competitor.products);
  const pricePosition = determinePricePosition(competitor.products);
  // TODO: add metadata to the competitor type if not available
  const lastAnalyzed = getTimeSinceLastAnalysis(undefined);
  
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
  const hasDataGaps = competitor.dataGaps && competitor.dataGaps.length > 0;
  const hasRecentData = lastAnalyzed !== "Never" && !lastAnalyzed.includes("w ago");

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 hover:border-border h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              <CompetitorLogo domain={competitor.domain} />
              {hasDataGaps && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full border-2 border-background cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Missing data: {competitor.dataGaps.join(", ")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight truncate">{competitor.domain}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {competitor.products.length} products • {competitor.matchScore}% match
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/products?competitor=${encodeURIComponent(competitor.domain)}`}>
                  <Package className="mr-2 h-4 w-4" />
                  View Product Matches
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`https://${competitor.domain}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  Visit Website
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(competitor.domain)}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove Competitor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Badge variant={badgeInfo.variant} className={`text-xs ${badgeInfo.className ?? ''}`}>
            {badgeInfo.label}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {lastAnalyzed}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div>
                  <div className="text-lg font-bold">{totalMatches}</div>
                  <div className="text-xs text-muted-foreground">Matches</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Products that match your catalog</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div>
                  <div className={`text-lg font-bold ${getPricePositionColor(pricePosition)}`}>
                    {avgPriceDiff > 0 ? '+' : ''}{avgPriceDiff.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg. Diff</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Average price difference vs your products</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div>
                  <div className={cn(
                    "text-lg font-bold",
                    hasRecentData ? "text-green-500" : "text-yellow-500"
                  )}>
                    {hasDataGaps ? (
                      <AlertCircle className="h-5 w-5 mx-auto" />
                    ) : hasRecentData ? (
                      '✓'
                    ) : (
                      '⚠'
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {hasDataGaps ? 'Issues' : hasRecentData ? 'Fresh' : 'Stale'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {hasDataGaps 
                    ? `Data gaps: ${competitor.dataGaps.join(", ")}` 
                    : hasRecentData 
                    ? "Data is up to date" 
                    : "Data needs refreshing"
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Quick insights */}
        {competitor.matchReasons && competitor.matchReasons.length > 0 && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground mb-1">Why this competitor matters:</p>
            <p className="text-xs leading-relaxed line-clamp-2">{competitor.matchReasons[0]}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 mt-auto">
        {totalMatches > 0 ? (
          <div className="w-full space-y-2">
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              asChild
            >
              <Link href={`/products?tab=matched&competitor=${encodeURIComponent(competitor.domain)}`}>
                <DollarSign className="h-3 w-3 mr-2" />
                View {totalMatches} Matches
              </Link>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/products?competitor=${encodeURIComponent(competitor.domain)}`}>
                  <Package className="h-3 w-3 mr-1" />
                  Products
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://${competitor.domain}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/products?competitor=${encodeURIComponent(competitor.domain)}`}>
                  <Package className="h-3 w-3 mr-1" />
                  Products
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://${competitor.domain}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit
                </a>
              </Button>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}; 