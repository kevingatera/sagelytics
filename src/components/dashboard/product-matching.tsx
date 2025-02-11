"use client"

import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Badge } from "~/components/ui/badge"
import type { CompetitorInsight } from "~/lib/competitor-analysis"

interface ProductMatchingProps {
  competitors: CompetitorInsight[];
}

export function ProductMatching({ competitors }: ProductMatchingProps) {
  return (
    <div className="mt-8">
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
                  <h3 className="text-lg font-semibold flex items-center gap-2">
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Your Product</TableHead>
                        <TableHead>Match Score</TableHead>
                        <TableHead>Competitor Product</TableHead>
                        <TableHead>Price Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitor.products.map((product) => (
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
                                  {product.price ? `${product.currency} ${product.price}` : 'Price not available'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={match.matchScore > 80 ? "default" : "secondary"}>
                                {match.matchScore}%
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
                              {match.priceDiff !== null ? (
                                <span className={match.priceDiff > 0 ? "text-green-600" : "text-red-600"}>
                                  {match.priceDiff > 0 ? '+' : ''}{match.priceDiff}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 