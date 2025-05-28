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
  ExternalLink, 
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
  DialogTrigger 
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
  matchData?: ProductMatch[];
};

// Sample product data
const products: Product[] = [
  {
    id: 1,
    name: "Wireless Headphones X3",
    sku: "WH-X3-001",
    yourPrice: 59.99,
    competitors: [
      { platform: "Amazon", price: 54.99, difference: -8.3 },
      { platform: "Walmart", price: 62.99, difference: 5.0 },
      { platform: "eBay", price: 49.99, difference: -16.7 },
    ],
    stock: "In Stock",
    sales: 253,
  },
  {
    id: 2,
    name: "Bluetooth Speaker Max",
    sku: "BS-MAX-002",
    yourPrice: 79.99,
    competitors: [
      { platform: "Amazon", price: 84.99, difference: 6.3 },
      { platform: "Walmart", price: 79.99, difference: 0 },
      { platform: "eBay", price: 74.99, difference: -6.3 },
    ],
    stock: "Low Stock",
    sales: 187,
  },
  {
    id: 3,
    name: "Smart Watch Pro",
    sku: "SW-PRO-003",
    yourPrice: 149.99,
    competitors: [
      { platform: "Amazon", price: 159.99, difference: 6.7 },
      { platform: "Walmart", price: 149.99, difference: 0 },
      { platform: "eBay", price: 139.99, difference: -6.7 },
    ],
    stock: "In Stock",
    sales: 142,
  },
  {
    id: 4,
    name: "USB-C Cable 6ft",
    sku: "USB-C-004",
    yourPrice: 12.99,
    competitors: [
      { platform: "Amazon", price: 11.99, difference: -7.7 },
      { platform: "Walmart", price: 13.99, difference: 7.7 },
      { platform: "eBay", price: 9.99, difference: -23.1 },
    ],
    stock: "In Stock",
    sales: 412,
  },
  {
    id: 5,
    name: "Wireless Mouse",
    sku: "WM-005",
    yourPrice: 29.99,
    competitors: [
      { platform: "Amazon", price: 27.99, difference: -6.7 },
      { platform: "Walmart", price: 31.99, difference: 6.7 },
      { platform: "eBay", price: 24.99, difference: -16.7 },
    ],
    stock: "Out of Stock",
    sales: 98,
  },
];

const platformIcons = {
  Amazon: <ShoppingCart size={14} className="text-[#FF9900]" />,
  Walmart: <Store size={14} className="text-[#0071DC]" />,
  eBay: <Truck size={14} className="text-[#E53238]" />,
};

export function ProductTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showMatchDetails, setShowMatchDetails] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [matchData, setMatchData] = useState<Record<number, ProductMatch[]>>({});
  
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMonitorProduct = useCallback(async (productId: number) => {
    setIsMonitoring(true);

    try {
      // In a real implementation, this would make an API call to monitor prices
      // For demo purposes, we'll simulate a successful response after a delay
      setTimeout(() => {
        const product = products.find(p => p.id === productId);
        
        if (product) {
          // Create fake match data based on competitors
          const matches: ProductMatch[] = product.competitors.map(comp => ({
            name: product.name,
            url: null,
            price: product.yourPrice,
            currency: "USD",
            matchedProducts: [{
              name: `${comp.platform} ${product.name}`,
              url: null,
              matchScore: Math.floor(Math.random() * 30) + 70, // 70-99 match score
              priceDiff: comp.difference
            }],
            lastUpdated: new Date().toISOString()
          }));
          
          // Update match data
          setMatchData(prev => ({
            ...prev,
            [productId]: matches
          }));
          
          toast.success(`Price monitoring initiated for ${product.name}`);
        }
        
        setIsMonitoring(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to monitor prices:", error);
      toast.error("Failed to monitor prices. Please try again.");
      setIsMonitoring(false);
    }
  }, []);

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
                    <div className="font-medium">${product.yourPrice}</div>
                    <div className="text-xs text-muted-foreground">{product.sales} sales</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {product.competitors.map((competitor, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            {platformIcons[competitor.platform as keyof typeof platformIcons]}
                            {competitor.platform}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>${competitor.price}</span>
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
                                  {Math.abs(competitor.difference)}%
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <ArrowUp className="h-3 w-3 mr-0.5" />
                                  {competitor.difference}%
                                </span>
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      
                      {/* Display if match data is available */}
                      {matchData[product.id] && (
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
                            {matchData[product.id]?.length ?? 0} matches found
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
                          <DropdownMenuItem>View on Amazon</DropdownMenuItem>
                          <DropdownMenuItem>View on Walmart</DropdownMenuItem>
                          <DropdownMenuItem>View on eBay</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
              {showMatchDetails !== null && matchData[showMatchDetails] && (
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
                    {matchData[showMatchDetails].flatMap(match => 
                      match.matchedProducts.map((matchedProduct, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{matchedProduct.name}</TableCell>
                          <TableCell>
                            <Badge variant={matchedProduct.matchScore > 80 ? "default" : "secondary"}>
                              {matchedProduct.matchScore}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            ${match.price ? match.price.toFixed(2) : "N/A"}
                          </TableCell>
                          <TableCell>
                            {matchedProduct.priceDiff !== null ? (
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
                                {matchedProduct.priceDiff}%
                              </span>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell>
                            {new Date(match.lastUpdated).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
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
