'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { DollarSign, Store, TrendingUp, Target, Users, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

// Mock data for now - will be replaced with actual API data
const mockCompetitors = [
  { 
    domain: 'amazon.com',
    matchScore: 85,
    matchReasons: ['Similar products', 'Overlapping audience'],
    suggestedApproach: 'Differentiate on quality',
    dataGaps: [],
    products: [
      { 
        name: 'Wireless Headphones', 
        url: 'https://amazon.com/headphones', 
        price: 49.99, 
        currency: 'USD',
        matchedProducts: [],
        lastUpdated: '2023-06-15T14:32:00Z'
      }
    ]
  },
  { 
    domain: 'walmart.com',
    matchScore: 72,
    matchReasons: ['Price competition', 'Market reach'],
    suggestedApproach: 'Focus on premium features',
    dataGaps: ['Reviews', 'Traffic data'],
    products: [
      { 
        name: 'Bluetooth Speaker', 
        url: 'https://walmart.com/speaker', 
        price: 29.99, 
        currency: 'USD',
        matchedProducts: [],
        lastUpdated: '2023-06-14T10:15:00Z'
      }
    ]
  }
];

export function SummaryCards() {
  // Calculate average match score
  const avgMatchScore = mockCompetitors.length > 0
    ? Math.round(mockCompetitors.reduce((acc, comp) => acc + comp.matchScore, 0) / mockCompetitors.length)
    : 0;

  // Calculate total monitored products
  const totalProducts = mockCompetitors.reduce((acc, comp) => acc + comp.products.length, 0);

  // Get unique platforms/sources where competitors were found
  const uniquePlatforms = new Set(mockCompetitors.map(c => c.domain));

  // Calculate market coverage (percentage of competitors with complete data)
  const marketCoverage = mockCompetitors.length > 0
    ? Math.round((mockCompetitors.filter(c => c.dataGaps.length === 0).length / mockCompetitors.length) * 100)
    : 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Competitors Tracked</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mockCompetitors.length}</div>
          <CardDescription>Total competitors monitored</CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">Found on {uniquePlatforms.size} different websites</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Price Analysis</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">5 Changes</div>
          <CardDescription>+2.3% vs Competitors</CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">Looking at {totalProducts} similar products</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{marketCoverage}%</div>
          <CardDescription>Data completeness</CardDescription>
          <div className="mt-2 text-xs text-muted-foreground">{marketCoverage > 80 ? 'Great data quality!' : 'Still gathering info'}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Market Strength</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgMatchScore}/100</div>
          <CardDescription>Performance score</CardDescription>
          <div className={cn("mt-2 text-xs", avgMatchScore >= 70 ? "text-success-foreground" : "text-warning-foreground")}>
            {avgMatchScore >= 80 ? "Market leader!" : avgMatchScore >= 70 ? "Strong performance" : "Room for improvement"}
          </div>
        </CardContent>
      </Card>
    </>
  );
} 