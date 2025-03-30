import type { 
  ProductMatch as SharedProductMatch,
  CompetitorInsight,
  PlatformData as SharedPlatformData,
  PlatformMetrics as SharedPlatformMetrics
} from '@shared/types';

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

export type PlatformMetrics = SharedPlatformMetrics & {
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

export type PlatformData = SharedPlatformData & {
  metrics: PlatformMetrics;
};

export type ProductMatch = SharedProductMatch;

export type Product = {
  name: string;
  url: string;
  price: number | null;
  currency: string;
  matchedProducts: ProductMatch[];
  lastUpdated: string;
};

export type CompetitorBase = Pick<CompetitorInsight, 'domain' | 'matchScore' | 'matchReasons' | 'suggestedApproach' | 'dataGaps'> & {
  products: Product[];
};

export type DashboardCompetitor = CompetitorBase & {
  metadata: {
    platforms: PlatformData[];
    products: Product[];
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
