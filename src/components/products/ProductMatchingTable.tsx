'use client';

import { ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
} from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { CompetitorBase, DashboardProduct, ProductMatch } from '@shared/types';
import { cn } from '~/lib/utils';

interface ProductMatchingTableProps {
  competitors: CompetitorBase[];
}

// Generate unique key for table rows
function generateRowKey(domain: string, productName: string, matchName: string, idx: number): string {
  return `${domain}-${productName}-${matchName}-${idx}`.replace(/[^a-zA-Z0-9-]/g, '-');
}

export function ProductMatchingTable({ competitors }: ProductMatchingTableProps) {
  if (!competitors || competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Matching Analysis</CardTitle>
          <CardDescription>No competitor data available yet.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-10 w-10 mb-4" />
            <p>Add competitors to start the analysis.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Matching Analysis</CardTitle>
        <CardDescription>Compare your products with competitor offerings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {competitors.map((competitor) => {
          // Filter products that have at least one matched product
          const productsWithMatches = competitor.products.filter(
            (p) => p.matchedProducts && p.matchedProducts.length > 0
          );

          if (productsWithMatches.length === 0) {
            return (
              <div key={competitor.domain} className="border-b pb-6 last:border-b-0">
                <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                  {competitor.domain}
                  <a
                    href={`https://${competitor.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary"
                    aria-label={`Visit ${competitor.domain}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </h3>
                <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-md">
                  <AlertCircle className="mx-auto h-6 w-6 mb-2" />
                  <p className="text-sm">No product matches found for this competitor.</p>
                </div>
              </div>
            );
          }

          return (
            <div key={competitor.domain} className="border-b pb-6 last:border-b-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  {competitor.domain}
                  <a
                    href={`https://${competitor.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary"
                    aria-label={`Visit ${competitor.domain}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </h3>
                <Badge variant={competitor.matchScore > 80 ? "default" : "secondary"}>
                  {competitor.matchScore}% Match
                </Badge>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Your Product</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead className="w-[30%]">Competitor Product</TableHead>
                      <TableHead>Price Diff.</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsWithMatches.flatMap((product: DashboardProduct, productIdx: number) =>
                      product.matchedProducts.map((match: ProductMatch, matchIdx: number) => {
                        const score = match.matchScore ?? 0;
                        const badgeVariant = score > 80 ? 'default' : score > 60 ? 'outline' : 'secondary';
                        const badgeColorClass = score > 80 ? 'text-success' : score > 60 ? 'text-warning' : 'text-muted-foreground';
                        
                        // Create unique key that doesn't depend on potentially missing URL values
                        const rowKey = generateRowKey(
                          competitor.domain,
                          product.name || `product-${productIdx}`,
                          match.name || `match-${matchIdx}`,
                          matchIdx
                        );
                        
                        return (
                          <TableRow key={rowKey} className="hover:bg-muted/50">
                            <TableCell className="font-medium align-top py-3">
                              <a
                                href={product.url ?? ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-primary-foreground"
                              >
                                {product.name}
                              </a>
                              <p className="text-xs text-muted-foreground mt-1">
                                {product.price
                                  ? `${product.currency ?? 'USD'} ${product.price.toFixed(2)}`
                                  : 'Price N/A'}
                              </p>
                            </TableCell>
                            <TableCell className="align-top py-3">
                              <Badge 
                                variant={badgeVariant}
                                className={cn("text-xs font-semibold", badgeColorClass)}
                              >
                                {match.matchScore ? `${match.matchScore}%` : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="align-top py-3">
                              <a
                                href={match.url ?? ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-sm"
                              >
                                {match.name}
                              </a>
                            </TableCell>
                            <TableCell className="align-top py-3">
                              {match.priceDiff !== null && match.priceDiff !== undefined ? (
                                <span
                                  className={cn(
                                    "text-sm font-semibold",
                                    match.priceDiff < -1 
                                      ? "text-success" 
                                      : match.priceDiff > 1
                                      ? "text-danger"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {match.priceDiff > 0 ? '+' : ''}
                                  {match.priceDiff.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="align-top py-3">
                              {/* Extract domain safely */}
                              {((): string => {
                                try {
                                  return new URL(match.url ?? 'https://unknown.com').hostname.replace(/^www\./, '');
                                } catch {
                                  return 'unknown.com';
                                }
                              })()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {competitor.dataGaps.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium">Data Gaps:</span>{' '}
                  {competitor.dataGaps.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
} 