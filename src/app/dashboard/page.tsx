import { type Metadata } from "next";
import { Suspense } from "react";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { PricingTrends } from "~/components/dashboard/PricingTrends";
import { RecentAlerts } from "~/components/dashboard/RecentAlerts";
import { CompetitorOverview } from "~/components/dashboard/CompetitorOverview";
import { SummaryCards } from "~/components/dashboard/SummaryCards";
import { PriceChangesTable } from "~/components/dashboard/PriceChangesTable";
import { auth } from "~/server/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard | Sagelytics",
  description: "Monitor your product pricing across marketplaces.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return <div>Unauthorized</div>;
  const showOnboardingBanner = session.user && !session.user.onboardingCompleted;
  return (
    <div className="bg-background">
      <Sidebar />
      <div className="ml-[4.5rem] md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            {showOnboardingBanner && (
              <div className="rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 p-4 flex items-center justify-between text-yellow-800 dark:text-yellow-200">
                <p>Finish onboarding to unlock all features.</p>
                <Link href="/onboarding" className="text-yellow-600 dark:text-yellow-300 underline">Go to onboarding</Link>
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
