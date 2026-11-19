import type { Metadata } from "next";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { DataImportExportClient } from "~/components/settings/DataImportExportClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Import/Export | Sagelytics",
  description: "Import and export your sales, inventory, and competitor data.",
};

export default function DataImportExportPage() {
  return (
    <div className="bg-background">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 md:p-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href="/settings"
                  className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground max-md:min-h-11"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Settings
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">Data Import/Export</h1>
                <p className="text-muted-foreground mt-1">
                  Bring your own data or export existing data for analysis
                </p>
              </div>
            </div>
            <DataImportExportClient />
          </div>
        </main>
      </div>
    </div>
  );
} 