'use client';

import { useEffect, useState } from 'react';
import { AddMonitoringTaskForm } from './AddMonitoringTaskForm';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Competitor {
  id: string;
  domain: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
  currency?: string;
}

interface MonitoringTaskFormValues {
  competitorDomain: string;
  frequency: string;
  enabled: boolean;
  productIds: string[];
}

interface AddMonitoringTaskContainerProps {
  userId: string;
}

export function AddMonitoringTaskContainer({ userId }: AddMonitoringTaskContainerProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
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
        competitorsResponse.json() as Promise<{ competitors: Competitor[] }>,
        productsResponse.json() as Promise<{ products: Product[] }>
      ]);

      setCompetitors(competitorsData.competitors);
      setProducts(productsData.products);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load competitors or products');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(values: MonitoringTaskFormValues): Promise<void> {
    try {
      const selectedProducts = products.filter(p => values.productIds.includes(p.id));
      
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to monitor');
        return;
      }

      const productUrls = selectedProducts.map(product => ({
        id: product.id,
        name: product.name,
        url: `https://example.com/products/${product.id}`,
        price: product.price,
        currency: product.currency ?? 'USD',
      }));

      const response = await fetch('/api/monitoring-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitorDomain: values.competitorDomain,
          productUrls,
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
    } catch (error) {
      console.error('Error creating monitoring task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create monitoring task');
    }
  }

  // Format competitors for the form
  const formattedCompetitors = competitors.map(competitor => ({
    domain: competitor.domain,
  }));

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
      competitors={formattedCompetitors}
      products={products}
      onSubmit={handleSubmit}
    />
  );
} 