"use client"

import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js"
import annotationPlugin from 'chartjs-plugin-annotation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import type { ChartData } from "~/lib/types/dashboard"

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  annotationPlugin
)

interface PriceComparisonProps {
  priceData: ChartData;
}

export function PriceComparison({ priceData }: PriceComparisonProps) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-gray-200 mb-4">Competitor Price Intelligence</h2>
      <Card>
        <CardHeader>
          <CardTitle>Real-time Price Comparison</CardTitle>
          <CardDescription>Your prices vs competitors across platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line
              data={priceData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  annotation: {
                    annotations: {
                      priceWarning: {
                        type: 'line',
                        yMin: 100,
                        yMax: 100,
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2,
                        borderDash: [5, 5]
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 