import type { 
  ProductMatch as SharedProductMatch,
  CompetitorInsight,
  PlatformData as SharedPlatformData,
  PlatformMetrics as SharedPlatformMetrics
} from './index'; // Updated import path

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

export type DashboardPlatformMetrics = SharedPlatformMetrics & {
  sales?: number;
  reviews?: number;
  rating?: number;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  lastUpdated: string;
};

export type DashboardPlatformData = SharedPlatformData & {
  metrics: DashboardPlatformMetrics;
};

export interface ProductMatch {
  name: string;
  url: string | null;
  price: number | null;
  currency: string | null;
  matchScore: number;
  platform?: string;
  matchedProducts: Array<{
    name: string;
    url: string | null;
    matchScore: number;
    priceDiff: number | null;
  }>;
}

export type DashboardProduct = {
  name: string;
  url: string;
  price: number | null;
  currency: string;
  matchedProducts: SharedProductMatch[];
  lastUpdated: string;
};

export type CompetitorBase = Pick<CompetitorInsight, 'domain' | 'matchScore' | 'matchReasons' | 'suggestedApproach' | 'dataGaps'> & {
  products: DashboardProduct[];
};

export type DashboardCompetitor = CompetitorBase & {
  metadata: {
    platforms: DashboardPlatformData[];
    products: DashboardProduct[];
  };
};

export type DashboardData = {
  competitors: CompetitorBase[];
  insights: {
    product: string;
    recommendation: string;
    message: string;
    reason: string;
  }[];
  priceData: ChartData;
}; 