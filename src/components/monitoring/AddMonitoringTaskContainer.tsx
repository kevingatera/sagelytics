'use client';

import { useEffect, useState } from 'react';
import { AddMonitoringTaskForm, type MonitoringTaskSubmission } from './AddMonitoringTaskForm';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { buildProductUrls, type CompetitorOption } from './monitoring-urls';

interface CompetitorResponse {
  id: string;
  domain: string;
  metadata?: {
    products?: Array<{
      name: string;
      url: string;
      matchedProducts?: Array<{ name: string; matchScore: number }>;
    }>;
  };
}

interface Product {
  id: string;
  name: string;
  price?: number;
  currency?: string;
}

interface AddMonitoringTaskContainerProps {
  userId: string;
}

export function AddMonitoringTaskContainer({ userId }: AddMonitoringTaskContainerProps) {
  const [competitors, setCompetitors] = useState<CompetitorOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchData();
  }, [userId]);

  async function fetchData() {
    try {
      const [competitorsResponse, productsResponse] = await Promise.all([
        fetch('/api/competitors'),
        fetch('/api/products')
      ]);

      if (!competitorsResponse.ok) {
        throw new Error('Failed to fetch competitors');
      }
      if (!productsResponse.ok) {
        throw new Error('Failed to fetch products');
      }

      const [competitorsData, productsData] = await Promise.all([
        competitorsResponse.json() as Promise<{ competitors: CompetitorResponse[] }>,
        productsResponse.json() as Promise<{ products: Product[] }>
      ]);

      setCompetitors(
        competitorsData.competitors.map((competitor) => ({
          domain: competitor.domain,
          products: competitor.metadata?.products ?? [],
        })),
      );
      setProducts(productsData.products);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load competitors or products');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(values: MonitoringTaskSubmission): Promise<boolean> {
    try {
      const selectedProducts = products.filter(p => values.productIds.includes(p.id));

      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to monitor');
        return false;
      }

      const { entries, invalid } = buildProductUrls(selectedProducts, values.productUrls);

      if (invalid.length > 0) {
        toast.error(`Fix the URL for ${invalid.map((p) => p.name).join(', ')}`);
        return false;
      }
      if (entries.length === 0) {
        toast.error('Enter a competitor product URL for at least one selected product');
        return false;
      }

      const response = await fetch('/api/monitoring-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitorDomain: values.competitorDomain,
          productUrls: entries,
          frequency: values.frequency,
          enabled: values.enabled,
          discoverySource: 'manual',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error: string };
        throw new Error(errorData.error || 'Failed to create monitoring task');
      }

      toast.success('Monitoring task created successfully');

      window.location.href = '/monitoring';
      return true;
    } catch (error) {
      console.error('Error creating monitoring task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create monitoring task');
      return false;
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <AddMonitoringTaskForm
      competitors={competitors}
      products={products}
      onSubmit={handleSubmit}
    />
  );
}
