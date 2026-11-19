import { type Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";

export const metadata: Metadata = {
  title: "AI Insights | Sagelytics",
  description: "Get AI-powered insights for your business.",
};

export default function InsightsPage() {
  return (
    <div className="bg-background">
      <Sidebar />
      <div className="ml-[4.5rem] md:ml-64 flex flex-col min-h-screen transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">AI Insights</h1>
            </div>
            
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-medium">No insights yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Insights will appear here once monitoring has recorded competitor prices for your products.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/competitors">Review competitors</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/monitoring">Set up monitoring</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 