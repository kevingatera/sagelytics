'use client';

import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { 
  ArrowDown, 
  ArrowUp, 
  ExternalLink, 
  MoreHorizontal, 
  ShoppingCart, 
  Store, 
  Truck 
} from "lucide-react";
import { cn } from "~/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "~/components/ui/dropdown-menu";

interface CompetitorCardProps {
  name: string;
  logo: React.ReactNode;
  productMatches: number;
  totalProducts: number;
  avgPriceDiff: number;
  pricePosition: "cheaper" | "higher" | "mixed";
  recentChanges: number;
  className?: string;
}

export function CompetitorCard({
  name,
  logo,
  productMatches,
  totalProducts,
  avgPriceDiff,
  pricePosition,
  recentChanges,
  className,
}: CompetitorCardProps) {
  const pricePositionConfig = {
    cheaper: { label: "Cheaper Than You", color: "text-danger" },
    higher: { label: "Higher Than You", color: "text-success" },
    mixed: { label: "Mixed Pricing", color: "text-muted-foreground" },
  };

  const getPlatformColors = (name: string) => {
    switch (name) {
      case "Amazon":
        return "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30";
      case "Walmart":
        return "bg-[#0071DC]/10 text-[#0071DC] border-[#0071DC]/30";
      case "eBay":
        return "bg-[#E53238]/10 text-[#E53238] border-[#E53238]/30";
      case "Best Buy":
        return "bg-[#0046BE]/10 text-[#0046BE] border-[#0046BE]/30";
      case "Target":
        return "bg-[#CC0000]/10 text-[#CC0000] border-[#CC0000]/30";
      default:
        return "bg-muted/10 text-muted-foreground border-muted/30";
    }
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", getPlatformColors(name))}>
            {logo}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground">
              {productMatches} of {totalProducts} products matched
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>View Products</DropdownMenuItem>
            <DropdownMenuItem>Update Tracking</DropdownMenuItem>
            <DropdownMenuItem>Disable Tracking</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg. Price Diff</p>
            <div className="flex items-center">
              {avgPriceDiff === 0 ? (
                <span className="text-xl font-medium">0%</span>
              ) : avgPriceDiff < 0 ? (
                <div className="flex items-center text-success">
                  <ArrowDown className="h-4 w-4 mr-1" />
                  <span className="text-xl font-medium">{Math.abs(avgPriceDiff).toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center text-danger">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span className="text-xl font-medium">{avgPriceDiff.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Recent Changes</p>
            <p className="text-xl font-medium">{recentChanges}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-sm">Price Position:</span>
              <span className={cn("text-sm font-medium", pricePositionConfig[pricePosition].color)}>
                {pricePositionConfig[pricePosition].label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Match Rate:</span>
              <span className="text-sm font-medium">
                {totalProducts > 0 ? Math.round((productMatches / totalProducts) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button className="w-full" variant="outline">
          <ExternalLink className="h-4 w-4 mr-2" />
          View on {name}
        </Button>
      </CardFooter>
    </Card>
  );
}
