import { type Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { PricingTrends } from "~/components/dashboard/PricingTrends";
import { RecentAlerts } from "~/components/dashboard/RecentAlerts";
import { CompetitorOverview } from "~/components/dashboard/CompetitorOverview";
import { SummaryCards } from "~/components/dashboard/SummaryCards";
import { PriceChangesTable } from "~/components/dashboard/PriceChangesTable";
import { SetupNextStep } from "~/components/setup/NextStep";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dashboard | Sagelytics",
  description: "Monitor competitor pricing for your products.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="bg-background">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            </div>

            <SetupNextStep />
            
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
