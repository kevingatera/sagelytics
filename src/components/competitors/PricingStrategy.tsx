'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { CompetitorBase } from '@shared/types';

interface PricingStrategyProps {
  competitors: CompetitorBase[];
}

export function PricingStrategy({ competitors }: PricingStrategyProps) {
  // Calculate average price difference across all competitors
  const avgPriceDiff = competitors.reduce((acc, competitor) => {
    const productDiffs = competitor.products.flatMap(product => 
      product.matchedProducts.map(match => match.priceDiff ?? 0)
    );
    const avgDiff = productDiffs.length > 0 
      ? productDiffs.reduce((sum, diff) => sum + diff, 0) / productDiffs.length
      : 0;
    return acc + avgDiff;
  }, 0) / (competitors.length || 1);

  // Generate pricing recommendations based on competitor data
  const recommendations = [
    {
      type: avgPriceDiff > 5 ? 'decrease' : avgPriceDiff < -5 ? 'increase' : 'maintain',
      message: avgPriceDiff > 5 
        ? 'Consider reducing prices to stay competitive'
        : avgPriceDiff < -5
        ? 'Room for potential price increase'
        : 'Maintain current pricing strategy',
      reason: avgPriceDiff > 5 
        ? 'Your prices are significantly higher than competitors'
        : avgPriceDiff < -5
        ? 'Your prices are notably lower than market average'
        : 'Your prices are well-aligned with the market',
    },
    {
      type: 'opportunity',
      message: 'Monitor competitor price changes',
      reason: `Tracking ${competitors.length} competitors across multiple platforms`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Strategy</CardTitle>
        <CardDescription>AI-powered pricing recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Market Position</p>
              <p className="text-2xl font-bold">
                {Math.abs(avgPriceDiff).toFixed(1)}% {avgPriceDiff > 0 ? 'Higher' : 'Lower'}
              </p>
            </div>
            <Badge variant={Math.abs(avgPriceDiff) < 5 ? "default" : "secondary"}>
              {Math.abs(avgPriceDiff) < 5 ? 'Competitive' : 'Review Needed'}
            </Badge>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  {rec.type === 'increase' ? (
                    <ArrowUp className="text-success" />
                  ) : rec.type === 'decrease' ? (
                    <ArrowDown className="text-danger" />
                  ) : (
                    <Zap className="text-warning" />
                  )}
                  <span className="font-medium">{rec.message}</span>
                </div>
                <p className="text-sm text-muted-foreground">{rec.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 