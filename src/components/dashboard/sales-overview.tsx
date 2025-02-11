"use client"

import { useState } from "react"
import { Bar } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import type { DashboardData, DashboardCompetitor, CompetitorBase, PlatformData, PlatformMetrics } from "~/lib/types/dashboard"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface SalesOverviewProps {
  data: DashboardData;
}

type MetricKey = keyof PlatformMetrics;

function isDashboardCompetitor(competitor: CompetitorBase): competitor is DashboardCompetitor {
  return 'metadata' in competitor && 
    competitor.metadata !== null && 
    typeof competitor.metadata === 'object' &&
    'platforms' in competitor.metadata &&
    Array.isArray(competitor.metadata.platforms);
}

export function SalesOverview({ data }: SalesOverviewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedCompetitor, setSelectedCompetitor] = useState("all")
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("sales")

  const handleMetricChange = (value: string) => {
    setSelectedMetric(value as MetricKey)
  }

  const platforms = ["all", ...new Set(data.competitors
    .filter(isDashboardCompetitor)
    .flatMap(c => c.metadata.platforms.map((p: PlatformData) => p.platform))
  )]

  const getMetricData = (competitor: CompetitorBase, platform: string): number => {
    if (!isDashboardCompetitor(competitor)) return 0;
    
    if (platform === "all") {
      return competitor.metadata.platforms.reduce((acc: number, p: PlatformData) => {
        if (selectedMetric === "priceRange") {
          return acc + (p.metrics.priceRange?.max ?? 0)
        }
        const value = p.metrics[selectedMetric]
        return acc + (typeof value === 'number' ? value : 0)
      }, 0)
    }

    const platformData = competitor.metadata.platforms.find((p: PlatformData) => p.platform === platform)
    if (selectedMetric === "priceRange") {
      return platformData?.metrics.priceRange?.max ?? 0
    }
    const value = platformData?.metrics[selectedMetric]
    return typeof value === 'number' ? value : 0
  }

  const filteredCompetitors = selectedCompetitor === "all" 
    ? data.competitors 
    : data.competitors.filter(c => c.domain === selectedCompetitor)

  const chartData = {
    labels: filteredCompetitors.map(c => c.domain),
    datasets: [{
      label: selectedMetric === "sales" ? "Sales Volume" 
        : selectedMetric === "reviews" ? "Review Count"
        : selectedMetric === "rating" ? "Rating"
        : "Price Range",
      data: filteredCompetitors.map(c => getMetricData(c, selectedPlatform)),
      backgroundColor: "rgba(59, 130, 246, 0.5)",
      borderColor: "rgb(59, 130, 246)",
      borderWidth: 1,
    }]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} by Platform`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>Platform-specific performance metrics.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4 space-x-4">
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Competitor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitors</SelectItem>
              {data.competitors?.map((competitor) => (
                <SelectItem key={competitor.domain} value={competitor.domain}>
                  {competitor.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={selectedMetric} onValueChange={handleMetricChange} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="rating">Rating</TabsTrigger>
              <TabsTrigger value="priceRange">Price</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="h-[300px] rounded-lg shadow-lg overflow-hidden">
          <Bar data={chartData} options={options} />
        </div>

        {selectedCompetitor !== "all" && selectedPlatform !== "all" && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Platform Details</h4>
            {data.competitors
              .filter(isDashboardCompetitor)
              .filter(c => c.domain === selectedCompetitor)
              .map(competitor => {
                const platformData = competitor.metadata.platforms
                  .find((p: PlatformData) => p.platform === selectedPlatform)
                
                return platformData ? (
                  <div key={platformData.platform} className="space-y-2">
                    <p>Store URL: <a href={platformData.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{platformData.url}</a></p>
                    <p>Sales: {platformData.metrics.sales?.toLocaleString()}</p>
                    <p>Reviews: {platformData.metrics.reviews?.toLocaleString()}</p>
                    <p>Rating: {platformData.metrics.rating?.toFixed(1)} / 5.0</p>
                    <p>Price Range: {platformData.metrics.priceRange?.min} - {platformData.metrics.priceRange?.max} {platformData.metrics.priceRange?.currency}</p>
                    <p className="text-sm text-muted-foreground">Last Updated: {new Date(platformData.metrics.lastUpdated).toLocaleDateString()}</p>
                  </div>
                ) : null
              })}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 