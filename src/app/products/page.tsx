import { Metadata } from "next";
import { Suspense } from "react";
import { ProductTable } from "~/components/products/ProductTable";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Products | Sagelytics",
  description: "Manage your product catalog and pricing.",
};

export default function ProductsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            </div>
            
            <Suspense fallback={<div>Loading...</div>}>
              <ProductTable />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
} 