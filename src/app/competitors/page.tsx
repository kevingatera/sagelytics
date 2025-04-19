import { Metadata } from "next";
import { Suspense } from "react";
import { CompetitorCard } from "~/components/competitors/CompetitorCard";
import { ProductMatchingTable } from "~/components/products/ProductMatchingTable";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { api } from "~/trpc/server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Users, Target, LineChart, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import type { CompetitorBase, DashboardProduct, ProductMatch } from "@shared/types";

export const metadata: Metadata = {
  title: "Competitors | Sagelytics",
  description: "Monitor your competitors across marketplaces.",
};

export default async function CompetitorsPage() {
  const { competitors } = await api.competitor.get();

  // Calculate stats
  const avgMatchScore = Math.round(competitors.reduce((acc, competitor) => acc + competitor.matchScore, 0) / competitors.length);
  const totalProducts = competitors.reduce((acc, competitor) => acc + competitor.products.length, 0);
  const marketCoverage = Math.round(competitors.reduce((acc, competitor) => acc + (competitor.dataGaps.length === 0 ? 1 : 0), 0) / competitors.length * 100);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
            </div>

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
                      {totalProducts} products tracked
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-medium">Match Score</CardTitle>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Average match score across all competitors</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{avgMatchScore}%</div>
                    <p className="text-xs text-muted-foreground">
                      Average competitor match rate
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
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Suspense fallback={<div>Loading...</div>}>
                {competitors.map((competitor: CompetitorBase) => (
                  <CompetitorCard
                    key={competitor.domain}
                    name={competitor.domain}
                    logo={<img src={`https://www.google.com/s2/favicons?domain=${competitor.domain}&sz=32`} alt={competitor.domain} className="w-8 h-8" />}
                    productMatches={competitor.products.reduce((acc: number, p: DashboardProduct) => acc + p.matchedProducts.length, 0)}
                    totalProducts={competitor.products.length}
                    avgPriceDiff={
                      competitor.products.reduce((acc: number, p: DashboardProduct) => {
                        const diffs = p.matchedProducts
                          .map((m: ProductMatch) => m.priceDiff)
                          .filter((d): d is number => d !== null && d !== undefined);
                        return diffs.length > 0 ? acc + (diffs.reduce((a, b) => a + b, 0) / diffs.length) : acc;
                      }, 0) / (competitor.products.length || 1)
                    }
                    pricePosition={
                      competitor.products.reduce((acc: "cheaper" | "higher" | "mixed", p: DashboardProduct) => {
                        const diffs = p.matchedProducts
                          .map((m: ProductMatch) => m.priceDiff)
                          .filter((d): d is number => d !== null && d !== undefined);
                        if (diffs.length === 0) return acc;
                        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
                        return avg < -1 ? "cheaper" : avg > 1 ? "higher" : "mixed";
                      }, "mixed" as const)
                    }
                    recentChanges={3} // This should come from change tracking, defaulting to 3 for now
                  />
                ))}
              </Suspense>
            </div>

            <div className="mt-8">
              <ProductMatchingTable competitors={competitors} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 