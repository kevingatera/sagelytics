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
  ExternalLink, 
  Filter, 
  MoreHorizontal, 
  Search,
  ShoppingCart, 
  Store, 
  Truck 
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

const products = [
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
  
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
