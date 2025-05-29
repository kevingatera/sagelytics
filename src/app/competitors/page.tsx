import type { Metadata } from "next"; 
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { CompetitorsClient } from "./CompetitorsClient";

export const metadata: Metadata = {
  title: "Competitors | Sagelytics",
  description: "Monitor your competitors across marketplaces.",
};

export default function CompetitorsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
                <p className="text-muted-foreground mt-1">
                  Monitor and analyze your competition across marketplaces
                </p>
              </div>
            </div>
            <CompetitorsClient />
          </div>
        </main>
      </div>
    </div>
  );
} 