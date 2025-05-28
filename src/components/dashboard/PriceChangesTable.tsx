'use client';

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ArrowDown, ArrowUp, Globe, AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";

interface PriceChange {
  id: string;
  competitor: string;
  product: string;
  oldPrice: number;
  newPrice: number;
  change: number;
  currency: string;
  matchScore?: number;
}

function PriceChangesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-[180px]" />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[100px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead><Skeleton className="h-4 w-[80px]" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function PriceChangesTable() {
  const { data, isLoading, error } = api.competitor.get.useQuery();

  if (isLoading) {
    return <PriceChangesTableSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Price Changes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-6 w-6 mb-2" />
            <p className="text-sm">Unable to load price data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { competitors } = data;

  // Generate price changes from competitor data
  const priceChanges: PriceChange[] = [];

  competitors.forEach((competitor) => {
    competitor.products.forEach((product) => {
      product.matchedProducts.forEach((match, index) => {
        if (match.priceDiff !== null && match.priceDiff !== undefined && Math.abs(match.priceDiff) > 1) {
          // Generate mock old/new prices based on price difference
          const currentPrice = product.price ?? 50; // Default price if not available
          const oldPrice = currentPrice / (1 + (match.priceDiff / 100));
          
          priceChanges.push({
            id: `${competitor.domain}-${product.name}-${index}`,
            competitor: competitor.domain,
            product: match.name || product.name,
            oldPrice: oldPrice,
            newPrice: currentPrice,
            change: match.priceDiff,
            currency: product.currency || 'USD',
            matchScore: match.matchScore,
          });
        }
      });
    });
  });

  // Sort by absolute change value (most significant changes first)
  priceChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Limit to top 5 changes
  const topChanges = priceChanges.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Price Changes</CardTitle>
        <p className="text-sm text-muted-foreground">
          Significant price differences detected across competitors
        </p>
      </CardHeader>
      <CardContent>
        {topChanges.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Your Price</TableHead>
                  <TableHead>Their Price</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topChanges.map((change) => (
                  <TableRow key={change.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {change.competitor}
                        {change.matchScore && (
                          <Badge variant="outline" className="text-xs">
                            {change.matchScore}% match
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={change.product}>
                      {change.product}
                    </TableCell>
                    <TableCell>
                      {change.currency} {change.newPrice.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {change.currency} {change.oldPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${change.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <div className="flex items-center justify-end">
                        {change.change > 0 ? (
                          <>
                            <ArrowUp className="h-4 w-4 mr-1" />
                            +{change.change.toFixed(1)}%
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-4 w-4 mr-1" />
                            {change.change.toFixed(1)}%
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Globe className="mx-auto h-8 w-8 mb-4" />
              <p className="text-sm">No significant price changes detected</p>
              <p className="text-xs mt-1">
                {competitors.length === 0 
                  ? "Add competitors to start tracking price changes"
                  : "Price differences will appear here when detected"
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 