'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import type { DashboardData } from '~/lib/types/dashboard';

ChartJS.register(CategoryScale, LinearScale, LineElement, Title, Tooltip, Legend, PointElement);

interface PricingStrategyProps {
  data: DashboardData;
}

export function PricingStrategy({ data }: PricingStrategyProps) {
  const chartData = {
    labels: data.priceData.labels,
    datasets: [
      {
        label: 'Your Price',
        data: data.priceData.datasets[0]?.data ?? [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      ...data.competitors.map((competitor, index) => ({
        label: competitor.domain,
        data: data.priceData.datasets[index + 1]?.data ?? [],
        backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
        borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
        borderWidth: 1,
      })),
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Pricing Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Strategy</CardTitle>
        <CardDescription>Adjust your pricing strategy based on market trends.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] overflow-hidden rounded-lg shadow-lg">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
