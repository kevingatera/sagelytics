import { Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { PricingTrends } from "~/components/dashboard/PricingTrends";
import { RecentAlerts } from "~/components/dashboard/RecentAlerts";
import { CompetitorOverview } from "~/components/dashboard/CompetitorOverview";
import { SummaryCards } from "~/components/dashboard/SummaryCards";
import { PriceChangesTable } from "~/components/dashboard/PriceChangesTable";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "Dashboard | Sagelytics",
  description: "Monitor your product pricing across marketplaces.",
};

export default async function DashboardPage() {
  const session = await auth();
  const showOnboardingBanner = session?.user && !session.user.onboardingCompleted;
  return (
    <div className="bg-background">
      <Sidebar />
      <div className="ml-[4.5rem] md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            {showOnboardingBanner && (
              <div className="rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-4 flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-yellow-800 dark:text-yellow-200">Finish onboarding to unlock all features.</span>
                </div>
                <a href="/onboarding" className="ml-4 px-4 py-2 rounded bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition">Get Started</a>
              </div>
            )}
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
