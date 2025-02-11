import type { CompetitorInsight } from "~/lib/competitor-analysis"

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export type PlatformMetrics = {
  sales?: number
  reviews?: number
  rating?: number
  priceRange?: {
    min: number
    max: number
    currency: string
  }
  lastUpdated: string
}

export type PlatformData = {
  platform: string
  url: string
  metrics: PlatformMetrics
}

export type ProductMatch = {
  name: string
  url: string
  matchScore: number
  priceDiff: number | null
}

export type Product = {
  name: string
  url: string
  price: number | null
  currency: string
  matchedProducts: ProductMatch[]
  lastUpdated: string
}

export type CompetitorBase = {
  domain: string
  matchScore: number
  matchReasons: string[]
  suggestedApproach: string
  dataGaps: string[]
  products: Product[]
}

export type DashboardCompetitor = CompetitorBase & {
  metadata: {
    platforms: PlatformData[]
    products: Product[]
  }
}

export type DashboardData = {
  competitors: CompetitorBase[]
  insights: {
    product: string
    recommendation: string
    message: string
    reason: string
  }[]
  priceData: ChartData
} 