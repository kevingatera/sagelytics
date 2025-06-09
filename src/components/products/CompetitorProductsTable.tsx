"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { 
  Search,
  ExternalLink,
  TrendingUp,
  Plus
} from "lucide-react";
import { cn } from "~/lib/utils";

type CompetitorProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  competitorDomain: string;
  url: string;
  platform: string;
  lastUpdated: string;
};

type CompetitorProductsTableProps = {
  products: CompetitorProduct[];
};

export function CompetitorProductsTable({ products }: CompetitorProductsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.competitorDomain.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower)
    );
  });

  const getCompetitorIcon = (domain: string) => {
    // You can add custom icons for known competitors
    return <ExternalLink className="h-4 w-4" />;
  };

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search competitor products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground ml-4">
            {filteredProducts.length} of {products.length} products
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {products.length === 0 
              ? "No competitor products found. Add competitors to discover their offerings."
              : "No products match your search criteria."
            }
          </div>
        ) : (
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Product</TableHead>
                  <TableHead className="font-medium">Competitor</TableHead>
                  <TableHead className="font-medium text-right">Price</TableHead>
                  <TableHead className="font-medium">Last Updated</TableHead>
                  <TableHead className="font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCompetitorIcon(product.competitorDomain)}
                        <div>
                          <p className="font-medium text-sm">
                            {product.competitorDomain.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {product.platform}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium">
                        {product.price > 0 
                          ? `${product.currency} ${product.price.toFixed(2)}`
                          : 'Free/Included'
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatLastUpdated(product.lastUpdated)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {product.url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            asChild
                          >
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            // TODO: Implement "Add to my catalog" functionality
                            console.log('Add to catalog:', product);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add to Catalog
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 