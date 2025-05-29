'use client';
import { useState, Suspense } from "react";
import { api as reactApi } from "~/trpc/react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { AddCompetitor } from "~/components/add-competitor";
import { ProductMatchingTable } from "~/components/products/ProductMatchingTable";
import type { CompetitorBase } from "@shared/types";
import { ModernCompetitorCard, CompetitorCardSkeleton } from "./CompetitorCards";

export function CompetitorsClient() {
  const { data, isLoading } = reactApi.competitor.get.useQuery();
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
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
      toast.success(`Discovered ${data.stats.totalDiscovered} competitors`);
      void utils.competitor.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to discover competitors');
    },
  });
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CompetitorCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }
  const competitors = data?.competitors ?? [];
  return (
    <div className="space-y-8">
      <div>
        <Suspense fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[180px]" />
              <Skeleton className="h-4 w-[220px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        }>
          <AddCompetitor />
        </Suspense>
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Competitors</h2>
          <Button variant="outline" size="sm" onClick={() => rediscoverCompetitors()} disabled={isRediscovering}>
            {isRediscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Data
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {competitors.map((competitor: CompetitorBase) => (
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
      </div>
      <div>
        <ProductMatchingTable competitors={competitors} />
      </div>
    </div>
  );
} 