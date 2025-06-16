'use client';
import { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { api as reactApi } from "~/trpc/react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Search, Package, TrendingUp, Users, BarChart3, Settings } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { AddCompetitor } from "~/components/add-competitor";
import type { CompetitorBase } from "@shared/types";
import { ModernCompetitorCard } from "./CompetitorCards";

// Enhanced competitor insights component
function CompetitorInsights({ competitors }: { competitors: CompetitorBase[] }) {
  const totalCompetitors = competitors.length;
  const totalProducts = competitors.reduce((acc, comp) => acc + comp.products.length, 0);
  const totalMatches = competitors.reduce((acc, comp) => 
    acc + comp.products.reduce((pAcc, prod) => pAcc + prod.matchedProducts.length, 0), 0
  );
  const avgMatchScore = totalCompetitors > 0 
    ? Math.round(competitors.reduce((acc, comp) => acc + comp.matchScore, 0) / totalCompetitors)
    : 0;

  const insights = [
    {
      title: "Total Competitors",
      value: totalCompetitors,
      icon: Users,
      description: "Active competitors tracked"
    },
    {
      title: "Products Monitored",
      value: totalProducts,
      icon: Package,
      description: "Competitor products discovered"
    },
    {
      title: "Product Matches",
      value: totalMatches,
      icon: TrendingUp,
      description: "Direct product overlaps"
    },
    {
      title: "Avg Match Score",
      value: `${avgMatchScore}%`,
      icon: BarChart3,
      description: "Overall relevance score"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => {
        const Icon = insight.icon;
        return (
          <Card key={insight.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="ml-2 text-sm font-medium">{insight.title}</h3>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">{insight.value}</div>
                <p className="text-xs text-muted-foreground">{insight.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Quick actions component
function CompetitorQuickActions({ competitors }: { competitors: CompetitorBase[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks for competitor management
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddCompetitor />
        <div className="grid gap-3 md:grid-cols-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/products">
              <Package className="mr-2 h-4 w-4" />
              View Product Matches
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/insights">
              <BarChart3 className="mr-2 h-4 w-4" />
              Market Analysis
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/monitoring">
              <TrendingUp className="mr-2 h-4 w-4" />
              Price Monitoring
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Update Settings
            </Link>
          </Button>
        </div>
        {competitors.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              You have {competitors.length} competitor{competitors.length === 1 ? '' : 's'} tracked with {' '}
              {competitors.reduce((acc, comp) => acc + comp.products.reduce((pAcc, prod) => pAcc + prod.matchedProducts.length, 0), 0)} product matches.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Competitor analytics summary
function CompetitorAnalytics({ competitors }: { competitors: CompetitorBase[] }) {
  const competitorsByPerformance = competitors
    .map(comp => ({
      ...comp,
      totalMatches: comp.products.reduce((acc, prod) => acc + prod.matchedProducts.length, 0),
      avgPriceDiff: comp.products.length > 0 
        ? comp.products.reduce((acc, prod) => {
            const diffs = prod.matchedProducts
              .map(m => m.priceDiff)
              .filter((d): d is number => d !== null && d !== undefined);
            return acc + (diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0);
          }, 0) / comp.products.length
        : 0
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Competitors</CardTitle>
        <CardDescription>
          Ranked by relevance and market overlap
        </CardDescription>
      </CardHeader>
      <CardContent>
        {competitorsByPerformance.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Users className="mx-auto h-8 w-8 mb-4" />
            <p>No competitor data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {competitorsByPerformance.slice(0, 5).map((competitor, index) => (
              <div key={competitor.domain} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{competitor.domain}</p>
                    <p className="text-sm text-muted-foreground">
                      {competitor.totalMatches} matches • {competitor.products.length} products
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={competitor.matchScore > 80 ? "default" : "secondary"}>
                    {competitor.matchScore}% match
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">
                    {competitor.avgPriceDiff > 0 ? '+' : ''}{competitor.avgPriceDiff.toFixed(1)}% avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CompetitorsClient() {
  const { data, isLoading } = reactApi.competitor.get.useQuery();
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const utils = reactApi.useUtils();
  const { mutate: removeCompetitor } = reactApi.competitor.remove.useMutation({
    onSuccess: () => {
      toast.success('Competitor removed');
      setDeletingDomain(null);
      void utils.competitor.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove competitor');
      setDeletingDomain(null);
    },
  });
  const { mutate: rediscoverCompetitors, isPending: isRediscovering } = reactApi.competitor.rediscover.useMutation({
    onSuccess: (data) => {
      toast.success(`Discovery completed! Found ${data.stats.totalDiscovered} competitors, ${data.stats.newCompetitors} new`);
      void utils.competitor.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to discover competitors');
    },
  });

  const competitors = data?.competitors ?? [];

  // Filter competitors based on search query
  const filteredCompetitors = useMemo(() => {
    if (!searchQuery.trim()) return competitors;
    
    const query = searchQuery.toLowerCase();
    return competitors.filter(competitor => 
      competitor.domain.toLowerCase().includes(query) ||
      competitor.matchReasons?.some(reason => reason.toLowerCase().includes(query))
    );
  }, [competitors, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Competitor Insights Overview */}
      <CompetitorInsights competitors={competitors} />

      {/* Analytics and Quick Actions - 50/50 split */}
      <div className="grid gap-6 md:grid-cols-2">
        <CompetitorAnalytics competitors={competitors} />
        <CompetitorQuickActions competitors={competitors} />
      </div>

      {/* Competitor Management */}
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Competitors</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => rediscoverCompetitors()} disabled={isRediscovering}>
              {isRediscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {isRediscovering ? 'Discovering...' : 'Rediscover'}
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-6">
          {competitors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No competitors found yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Start by adding competitors manually or trigger automatic discovery to find potential competitors based on your business profile.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => rediscoverCompetitors()} disabled={isRediscovering}>
                    {isRediscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                    Start Auto Discovery
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/products">
                      <Package className="mr-2 h-4 w-4" />
                      View Products Instead
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search functionality */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search competitors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    {filteredCompetitors.length} of {competitors.length} competitors
                  </p>
                )}
              </div>

              {/* Competitor grid */}
              {filteredCompetitors.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No competitors match your search</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search terms or clear the search to see all competitors.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear Search
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCompetitors.map((competitor: CompetitorBase) => (
                    <ModernCompetitorCard
                      key={competitor.domain}
                      competitor={competitor}
                      onDelete={(domain: string) => {
                        setDeletingDomain(domain);
                        removeCompetitor({ url: domain });
                      }}
                      deleting={deletingDomain === competitor.domain}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 