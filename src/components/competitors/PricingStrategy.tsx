'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';
import type { CompetitorBase } from "@shared/types";

interface PricingStrategyProps {
  competitors: CompetitorBase[];
}

export function PricingStrategy({ competitors }: PricingStrategyProps) {
  // Calculate comprehensive pricing metrics
  const calculatePricingMetrics = () => {
    let totalPriceDiffs = 0;
    let priceComparisonCount = 0;
    let higherPricedProducts = 0;
    let lowerPricedProducts = 0;
    let competitivePricedProducts = 0;
    
    const productAnalysis: Array<{
      productName: string;
      competitorCount: number;
      avgPriceDiff: number;
      competitorPrices: Array<{domain: string, price: number, difference: number}>;
    }> = [];

    competitors.forEach((competitor) => {
      competitor.products.forEach((product) => {
        product.matchedProducts.forEach((match) => {
          if (match.priceDiff !== null && match.priceDiff !== undefined) {
            totalPriceDiffs += match.priceDiff;
            priceComparisonCount++;
            
            if (match.priceDiff > 10) higherPricedProducts++;
            else if (match.priceDiff < -10) lowerPricedProducts++;
            else competitivePricedProducts++;

            // Find or create product analysis entry
            let productEntry = productAnalysis.find(p => p.productName === match.name);
            if (!productEntry) {
              productEntry = {
                productName: match.name,
                competitorCount: 0,
                avgPriceDiff: 0,
                competitorPrices: []
              };
              productAnalysis.push(productEntry);
            }

            productEntry.competitorCount++;
            productEntry.competitorPrices.push({
              domain: competitor.domain,
              price: product.price ?? 0,
              difference: match.priceDiff
            });
          }
        });
      });
    });

    // Calculate average price differences for each product
    productAnalysis.forEach(product => {
      const totalDiff = product.competitorPrices.reduce((sum, comp) => sum + comp.difference, 0);
      product.avgPriceDiff = product.competitorCount > 0 ? totalDiff / product.competitorCount : 0;
    });

    const avgPriceDiff = priceComparisonCount > 0 ? totalPriceDiffs / priceComparisonCount : 0;

    return {
      avgPriceDiff,
      priceComparisonCount,
      higherPricedProducts,
      lowerPricedProducts,
      competitivePricedProducts,
      productAnalysis: productAnalysis.sort((a, b) => Math.abs(b.avgPriceDiff) - Math.abs(a.avgPriceDiff)).slice(0, 5)
    };
  };

  const metrics = calculatePricingMetrics();

  // Generate smart pricing recommendations
  const generateRecommendations = () => {
    const recommendations = [];

    if (metrics.avgPriceDiff > 15) {
      recommendations.push({
        type: 'decrease' as const,
        icon: <TrendingDown className="h-4 w-4" />,
        title: 'Consider Price Reduction',
        message: `Your prices are ${metrics.avgPriceDiff.toFixed(1)}% higher than competitors on average`,
        priority: 'high' as const,
        action: 'Review pricing strategy to improve competitiveness',
      });
    } else if (metrics.avgPriceDiff < -15) {
      recommendations.push({
        type: 'increase' as const,
        icon: <TrendingUp className="h-4 w-4" />,
        title: 'Potential Price Increase',
        message: `Your prices are ${Math.abs(metrics.avgPriceDiff).toFixed(1)}% lower than competitors`,
        priority: 'medium' as const,
        action: 'Consider gradual price increases to capture more value',
      });
    } else {
      recommendations.push({
        type: 'maintain' as const,
        icon: <CheckCircle className="h-4 w-4" />,
        title: 'Competitive Pricing',
        message: 'Your prices are well-aligned with the market',
        priority: 'low' as const,
        action: 'Monitor competitor changes and maintain current strategy',
      });
    }

    // Add product-specific recommendations
    if (metrics.productAnalysis.length > 0) {
      const mostOverpriced = metrics.productAnalysis.find(p => p.avgPriceDiff > 20);
      const mostUnderpriced = metrics.productAnalysis.find(p => p.avgPriceDiff < -20);

      if (mostOverpriced) {
        recommendations.push({
          type: 'decrease' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          title: `"${mostOverpriced.productName}" Overpriced`,
          message: `${mostOverpriced.avgPriceDiff.toFixed(1)}% higher than ${mostOverpriced.competitorCount} competitors`,
          priority: 'high' as const,
          action: 'Review pricing for this specific product',
        });
      }

      if (mostUnderpriced) {
        recommendations.push({
          type: 'increase' as const,
          icon: <Lightbulb className="h-4 w-4" />,
          title: `"${mostUnderpriced.productName}" Underpriced`,
          message: `${Math.abs(mostUnderpriced.avgPriceDiff).toFixed(1)}% lower than market average`,
          priority: 'medium' as const,
          action: 'Opportunity for price optimization',
        });
      }
    }

    recommendations.push({
      type: 'monitor' as const,
      icon: <TrendingUp className="h-4 w-4" />,
      title: 'Competitive Intelligence',
      message: `Tracking ${competitors.length} competitors with ${metrics.priceComparisonCount} product comparisons`,
      priority: 'low' as const,
      action: 'Continue monitoring for market changes and opportunities',
    });

    return recommendations;
  };

  const recommendations = generateRecommendations();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'increase': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'maintain': return <Minus className="h-4 w-4 text-blue-600" />;
      default: return <Lightbulb className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Market Position Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Position Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.higherPricedProducts}</div>
              <div className="text-sm text-muted-foreground">Higher Priced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.competitivePricedProducts}</div>
              <div className="text-sm text-muted-foreground">Competitive</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.lowerPricedProducts}</div>
              <div className="text-sm text-muted-foreground">Lower Priced</div>
            </div>
          </div>
          
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="text-lg font-semibold">
              Average Price Difference: 
              <span className={`ml-2 ${metrics.avgPriceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.avgPriceDiff > 0 ? '+' : ''}{metrics.avgPriceDiff.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Based on {metrics.priceComparisonCount} product comparisons
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Pricing Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {rec.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge className={getPriorityColor(rec.priority)}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec.message}</p>
                  <p className="text-sm font-medium">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Product Analysis */}
      {metrics.productAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Product-Level Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.productAnalysis.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{product.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.competitorCount} competitor{product.competitorCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${product.avgPriceDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {product.avgPriceDiff > 0 ? '+' : ''}{product.avgPriceDiff.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1">
                      {getRecommendationIcon(product.avgPriceDiff > 10 ? 'decrease' : product.avgPriceDiff < -10 ? 'increase' : 'maintain')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 