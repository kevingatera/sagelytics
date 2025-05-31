"use client";

import { useState, useCallback } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { 
  ArrowDown, 
  ArrowUp, 
  ChevronDown, 
  Expand,
  Filter, 
  MoreHorizontal, 
  RefreshCw,
  Search,
  ShoppingCart, 
  Store, 
  Truck 
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { ProductMatch } from "@shared/types";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "~/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";

type CompetitorPrice = {
  platform: string;
  price: number;
  difference: number;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  yourPrice: number;
  competitors: CompetitorPrice[];
  stock: string;
  sales: number;
  matchData: ProductMatch[];
};

type ProductTableClientProps = {
  products: Product[];
};

const platformIcons = {
  Amazon: <ShoppingCart size={14} className="text-[#FF9900]" />,
  Walmart: <Store size={14} className="text-[#0071DC]" />,
  eBay: <Truck size={14} className="text-[#E53238]" />,
  default: <Store size={14} className="text-muted-foreground" />,
};

export function ProductTableClient({ products }: ProductTableClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showMatchDetails, setShowMatchDetails] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMonitorProduct = useCallback(async (productId: number) => {
    setIsMonitoring(true);

    try {
      // In a real implementation, this would make an API call to monitor prices
      setTimeout(() => {
        const product = products.find(p => p.id === productId);
        if (product) {
          toast.success(`Price monitoring initiated for ${product.name}`);
        }
        setIsMonitoring(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to monitor prices:", error);
      toast.error("Failed to monitor prices. Please try again.");
      setIsMonitoring(false);
    }
  }, [products]);

  const getplatformIcon = (platform: string) => {
    const cleanPlatform = platform.toLowerCase();
    if (cleanPlatform.includes('amazon')) return platformIcons.Amazon;
    if (cleanPlatform.includes('walmart')) return platformIcons.Walmart;
    if (cleanPlatform.includes('ebay')) return platformIcons.eBay;
    return platformIcons.default;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products by name or SKU..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center ml-4 gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Sort
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Name (A-Z)</DropdownMenuItem>
                <DropdownMenuItem>Name (Z-A)</DropdownMenuItem>
                <DropdownMenuItem>Price (Low to High)</DropdownMenuItem>
                <DropdownMenuItem>Price (High to Low)</DropdownMenuItem>
                <DropdownMenuItem>Sales Volume</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {products.length === 0 
              ? "No competitor products found. Complete competitor discovery first."
              : "No products match your search criteria."
            }
          </div>
        ) : (
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Product</TableHead>
                  <TableHead className="font-medium text-right">Your Price</TableHead>
                  <TableHead className="font-medium">Competitor Prices</TableHead>
                  <TableHead className="font-medium">Stock Status</TableHead>
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
                    <TableCell className="text-right">
                      <div className="font-medium">${product.yourPrice.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{product.sales} sales</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {product.competitors.length > 0 ? (
                          product.competitors.map((competitor, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-1.5">
                                {getplatformIcon(competitor.platform)}
                                <span className="truncate max-w-[120px]" title={competitor.platform}>
                                  {competitor.platform}
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span>${competitor.price.toFixed(2)}</span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    competitor.difference < 0 
                                      ? "text-success bg-success/10 border-success/20" 
                                      : competitor.difference > 0 
                                      ? "text-danger bg-danger/10 border-danger/20"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {competitor.difference === 0 ? (
                                    "="
                                  ) : competitor.difference < 0 ? (
                                    <span className="flex items-center">
                                      <ArrowDown className="h-3 w-3 mr-0.5" />
                                      {Math.abs(competitor.difference).toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="flex items-center">
                                      <ArrowUp className="h-3 w-3 mr-0.5" />
                                      {competitor.difference.toFixed(1)}%
                                    </span>
                                  )}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No competitor pricing data
                          </div>
                        )}
                        
                        {/* Display match data if available */}
                        {product.matchData.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-dashed">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">
                                Auto-matched competitors
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setShowMatchDetails(product.id)}
                              >
                                <Expand className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {product.matchData.length} matches found
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          product.stock === "In Stock" 
                            ? "text-success bg-success/10 border-success/20"
                            : product.stock === "Low Stock"
                            ? "text-warning bg-warning/10 border-warning/20"
                            : "text-danger bg-danger/10 border-danger/20"
                        )}
                      >
                        {product.stock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="mr-1 h-8"
                          disabled={isMonitoring}
                          onClick={() => handleMonitorProduct(product.id)}
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isMonitoring && "animate-spin")} />
                          Monitor
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Price</DropdownMenuItem>
                            <DropdownMenuItem>View Competitor</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Match Details Dialog */}
      <Dialog 
        open={showMatchDetails !== null} 
        onOpenChange={() => setShowMatchDetails(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {showMatchDetails !== null && 
                `Match Details: ${products.find(p => p.id === showMatchDetails)?.name}`
              }
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="matches" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="matches">Product Matches</TabsTrigger>
              <TabsTrigger value="history">Price History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="matches" className="py-4">
              {showMatchDetails !== null && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competitor Product</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Difference</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.find(p => p.id === showMatchDetails)?.matchData.flatMap(match => 
                      match.matchedProducts?.map((matchedProduct, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{matchedProduct.name}</TableCell>
                          <TableCell>
                            <Badge variant={matchedProduct.matchScore && matchedProduct.matchScore > 80 ? "default" : "secondary"}>
                              {matchedProduct.matchScore ?? 'N/A'}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            ${match.price ? match.price.toFixed(2) : "N/A"}
                          </TableCell>
                          <TableCell>
                            {matchedProduct.priceDiff !== undefined && matchedProduct.priceDiff !== null ? (
                              <span
                                className={cn(
                                  "font-medium",
                                  matchedProduct.priceDiff < 0 
                                    ? "text-success" 
                                    : matchedProduct.priceDiff > 0
                                    ? "text-danger"
                                    : "text-muted-foreground"
                                )}
                              >
                                {matchedProduct.priceDiff > 0 ? '+' : ''}
                                {matchedProduct.priceDiff.toFixed(1)}%
                              </span>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell>
                            {match.lastUpdated ? new Date(match.lastUpdated).toLocaleDateString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      )) ?? []
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="py-4">
              <div className="text-center py-8 text-muted-foreground">
                Price history tracking will be implemented in a future update
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 