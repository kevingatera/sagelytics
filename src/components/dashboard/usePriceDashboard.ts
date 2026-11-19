'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardPayload } from '~/app/api/price-history/dashboard/summary';

export function usePriceDashboard(days: number) {
  return useQuery<DashboardPayload>({
    queryKey: ['price-history-dashboard', days],
    queryFn: async () => {
      const res = await fetch(`/api/price-history/dashboard?days=${days}`);
      if (!res.ok) {
        throw new Error(`Failed to load price dashboard (${res.status})`);
      }
      return (await res.json()) as DashboardPayload;
    },
  });
}
