import { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { PricingTrends } from "~/components/dashboard/PricingTrends";
import { RecentAlerts } from "~/components/dashboard/RecentAlerts";
import { CompetitorOverview } from "~/components/dashboard/CompetitorOverview";
import { SummaryCards } from "~/components/dashboard/SummaryCards";
import { PriceChangesTable } from "~/components/dashboard/PriceChangesTable";

export const metadata: Metadata = {
  title: "Dashboard | Sagelytics",
  description: "Monitor your product pricing across marketplaces.",
};

export default function DashboardPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Last updated: Today at 9:45 AM</span>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Suspense fallback={<div>Loading...</div>}>
                <SummaryCards />
              </Suspense>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Suspense fallback={<div>Loading...</div>}>
                <PricingTrends />
              </Suspense>
              <Suspense fallback={<div>Loading...</div>}>
                <CompetitorOverview />
              </Suspense>
            </div>
            
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Suspense fallback={<div>Loading...</div>}>
                <PriceChangesTable />
              </Suspense>
              <Suspense fallback={<div>Loading...</div>}>
                <RecentAlerts />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
