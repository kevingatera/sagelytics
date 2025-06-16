'use client';

import { ExternalLink } from 'lucide-react';
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
import type { CompetitorBase, DashboardProduct } from '@shared/types';
import { cn } from '~/lib/utils';

interface ProductMatchingTableProps {
  competitors: CompetitorBase[];
}

export function ProductMatchingTable({ competitors }: ProductMatchingTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Matching Analysis</CardTitle>
        <CardDescription>Compare your products with competitor offerings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {competitors?.map((competitor) => {
            if (!competitor?.products?.length) return null;

            return (
              <div key={competitor.domain} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    {competitor.domain}
                    <a
                      href={`https://${competitor.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </h3>
                  <Badge variant={competitor.matchScore > 80 ? "default" : "secondary"}>
                    {competitor.matchScore}% Match
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Your Product</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Competitor Product</TableHead>
                      <TableHead>Price Difference</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitor.products.map((product: DashboardProduct) =>
                      product.matchedProducts.map((match, idx) => (
                        <TableRow key={`${product.url}-${match.url}-${idx}`}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <a
                                href={product.url ?? ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {product.name}
                              </a>
                              <span className="text-sm text-muted-foreground">
                                {product.price
                                  ? `${product.currency} ${product.price}`
                                  : 'Price not available'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={(match.matchScore ?? 0) > 80 ? 'default' : 'secondary'}
                              className={cn(
                                (match.matchScore ?? 0) > 80 
                                  ? "bg-success/10 text-success border-success/20" 
                                  : "bg-muted"
                              )}
                            >
                              {match.matchScore ? `${match.matchScore}%` : 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <a
                                href={match.url ?? ''}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {match.name}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            {match.priceDiff !== null && match.priceDiff !== undefined ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  match.priceDiff > 0 
                                    ? "text-success" 
                                    : match.priceDiff < 0
                                    ? "text-danger"
                                    : "text-muted-foreground"
                                )}
                              >
                                {match.priceDiff > 0 ? '+' : ''}
                                {match.priceDiff}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {new URL(product.url || 'https://unknown.com').hostname.replace('www.', '')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
                {competitor.dataGaps.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span className="font-medium">Data Gaps:</span>{' '}
                    {competitor.dataGaps.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
} 