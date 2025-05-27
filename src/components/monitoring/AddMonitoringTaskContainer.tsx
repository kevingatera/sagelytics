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
  price: number;
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
    async function fetchData() {
      try {
        // Fetch competitors
        const competitorsResponse = await fetch(`/api/competitors?userId=${userId}`);
        if (!competitorsResponse.ok) {
          throw new Error('Failed to fetch competitors');
        }
        const competitorsData: Competitor[] = await competitorsResponse.json();
        setCompetitors(competitorsData);

        // Fetch products
        const productsResponse = await fetch(`/api/products?userId=${userId}`);
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }
        const productsData: Product[] = await productsResponse.json();
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load competitors or products');
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [userId]);

  async function handleSubmit(values: MonitoringTaskFormValues): Promise<void> {
    try {
      const response = await fetch('/api/monitoring-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create monitoring task');
      }

      toast.success('Monitoring task created successfully');
      return;
    } catch (error) {
      console.error('Error creating monitoring task:', error);
      toast.error('Failed to create monitoring task');
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