import { Metadata } from "next";
import { Suspense } from "react";
import { InsightCard } from "~/components/insights/InsightCard";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";

export const metadata: Metadata = {
  title: "AI Insights | Sagelytics",
  description: "Get AI-powered insights for your business.",
};

const demoInsight = {
  title: "Price Optimization",
  description: "Based on market analysis, consider increasing your product prices by 5-10% to maximize revenue while maintaining competitiveness.",
  type: "opportunity" as const,
  impact: "high" as const,
  confidence: 0.85,
  category: "pricing",
  insights: [
    "Competitor prices have increased by 8% on average",
    "Your current prices are 12% below market average",
    "Historical data shows minimal impact on sales from price increases",
  ],
};

export default function InsightsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Suspense fallback={<div>Loading...</div>}>
                <InsightCard {...demoInsight} />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 