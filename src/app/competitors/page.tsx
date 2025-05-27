import { Metadata } from "next";
import { Suspense } from "react";
import { CompetitorCard } from "~/components/competitors/CompetitorCard";
import { CompetitorLogo } from "~/components/competitors/CompetitorLogo";
import { ProductMatchingTable } from "~/components/products/ProductMatchingTable";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { api } from "~/trpc/server";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Users, Target, LineChart, HelpCircle, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import type { CompetitorBase, DashboardProduct, ProductMatch } from "@shared/types";
import { Skeleton } from "~/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Competitors | Sagelytics",
  description: "Monitor your competitors across marketplaces.",
};

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

const CompetitorCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Skeleton className="h-3 w-[80px]" />
          <Skeleton className="h-6 w-[50px]" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-[100px]" />
          <Skeleton className="h-6 w-[30px]" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </CardContent>
    <CardFooter className="border-t pt-4">
      <Skeleton className="h-9 w-full" />
    </CardFooter>
  </Card>
);

export default async function CompetitorsPage() {
  const { competitors } = await api.competitor.get();

  // Calculate stats
  const totalCompetitors = competitors.length;
  const avgMatchScore = totalCompetitors > 0 
    ? Math.round(competitors.reduce((acc, competitor) => acc + competitor.matchScore, 0) / totalCompetitors)
    : 0;
  const totalProducts = competitors.reduce((acc, competitor) => acc + competitor.products.length, 0);
  const marketCoverage = totalCompetitors > 0
    ? Math.round(competitors.reduce((acc, competitor) => acc + (competitor.dataGaps.length === 0 ? 1 : 0), 0) / totalCompetitors * 100)
    : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
          </div>

          {/* Summary Stats */}
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
                        <p>Companies selling similar products/services</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCompetitors}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalProducts} products tracked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Avg. Match Score</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Average relevance score across competitors</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgMatchScore}%</div>
                  <p className="text-xs text-muted-foreground">
                    Average relevance
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Market Coverage</CardTitle>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of competitors with complete data</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <LineChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketCoverage}%</div>
                  <p className="text-xs text-muted-foreground">
                    Complete data coverage
                  </p>
                </CardContent>
              </Card>
            </div>
          </TooltipProvider>
          
          {/* Competitor Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Suspense 
              fallback={
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <CompetitorCardSkeleton key={`skeleton-${i}`} />
                  ))}
                </>
              }
            >
              {competitors.map((competitor: CompetitorBase) => (
                <CompetitorCard
                  key={competitor.domain}
                  name={competitor.domain}
                  logo={<CompetitorLogo domain={competitor.domain} />}
                  productMatches={competitor.products.reduce((acc: number, p: DashboardProduct) => acc + p.matchedProducts.length, 0)}
                  totalProducts={competitor.products.length}
                  avgPriceDiff={calculateAvgPriceDiff(competitor.products)}
                  pricePosition={determinePricePosition(competitor.products)}
                  recentChanges={0} // TODO: Replace with actual data
                />
              ))}
            </Suspense>
          </div>

          {/* Product Matching Table */}
          <div className="mt-4">
            <ProductMatchingTable competitors={competitors} />
          </div>
        </main>
      </div>
    </div>
  );
} 