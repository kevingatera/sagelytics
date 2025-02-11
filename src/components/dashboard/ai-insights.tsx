"use client"

import { ArrowDown, ArrowUp, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"

interface AIInsightsProps {
  insights: Array<{
    product: string;
    recommendation: string;
    message: string;
    reason: string;
  }>;
}

export function AIInsights({ insights }: AIInsightsProps) {
  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Insights</CardTitle>
          <CardDescription>Pricing recommendations based on market analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {insights?.map((insight) => (
              <li key={insight.product}>
                <div className="flex items-center">
                  {insight.recommendation === 'increase' ? (
                    <ArrowUp className="text-green-500 dark:text-green-400 mr-2" />
                  ) : insight.recommendation === 'decrease' ? (
                    <ArrowDown className="text-red-500 dark:text-red-400 mr-2" />
                  ) : (
                    <Zap className="text-yellow-500 dark:text-yellow-400 mr-2" />
                  )}
                  <span className="font-semibold">{insight.message}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insight.reason}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
} 