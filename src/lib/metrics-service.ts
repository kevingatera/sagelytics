import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { userOnboarding } from "~/server/db/schema";

export class MetricsService {
  private readonly businessRules: Record<string, string[]> = {
    ecommerce: ['revenue', 'inventory_value', 'repricing_actions'],
    saas: ['mrr', 'churn_rate', 'active_users'],
    marketplace: ['gmv', 'commission_rate', 'active_listings'],
  };

  async getRelevantMetrics(userId: string) {
    const onboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, userId)
    });
    
    if (!onboarding) return [];
    
    const availableMetrics = this.businessRules[onboarding.businessType] || [];
    const enabledMetrics = availableMetrics.filter(metric => 
      onboarding.metricConfig?.[metric] !== false
    );

    return this.enrichMetrics(enabledMetrics);
  }

  private enrichMetrics(metrics: string[]) {
    const metricDefinitions = {
      revenue: { name: 'Revenue', icon: 'DollarSign' },
      inventory_value: { name: 'Inventory Value', icon: 'Package' },
      repricing_actions: { name: 'Repricing Actions', icon: 'Zap' },
      active_listings: { name: 'Active Listings', icon: 'ShoppingCart' },
    };

    return metrics.map(metric => ({
      key: metric,
      ...metricDefinitions[metric as keyof typeof metricDefinitions]
    }));
  }

  async calculateMetricComparison(metric: string, userId: string) {
    const onboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, userId)
    });

    if (!onboarding) return null;

    // Example implementation - replace with actual logic
    const calculations: Record<string, () => Promise<MetricComparison>> = {
      revenue: async () => ({
        current: 100000,
        previous: 95000,
        trend: 5.26,
        competitors: {
          average: 98000,
          highest: 120000,
          lowest: 80000
        }
      }),
      inventory_value: async () => ({
        current: 50000,
        previous: 48000,
        trend: 4.17,
        competitors: {
          average: 55000,
          highest: 70000,
          lowest: 40000
        }
      }),
      // Add other metric calculations
    };

    const calculator = calculations[metric];
    if (!calculator) return null;

    return calculator();
  }
}

export interface MetricComparison {
  current: number;
  previous: number;
  trend: number;
  competitors: {
    average: number;
    highest: number;
    lowest: number;
  };
} 