import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductPageClient } from "~/components/products/ProductPageClient";
import { Sidebar } from "~/components/layout/Sidebar";
import { Navbar } from "~/components/layout/Navbar";
import { api } from "~/trpc/server";
import { safeCall } from "~/lib/auth-utils";

export const metadata: Metadata = {
  title: "Products | Sagelytics",
  description: "Manage your product catalog and pricing.",
};

async function ProductsContent() {
  const [userProducts, competitorProducts, matchedProducts] = await safeCall(
    api.competitor.getProducts(),
    api.competitor.getCompetitorOnlyProducts(),
    api.competitor.getMatchedProducts()
  );

  return (
    <ProductPageClient
      initialUserProducts={userProducts}
      initialCompetitorProducts={competitorProducts}
      initialMatchedProducts={matchedProducts}
    />
  );
}

export default function ProductsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              </div>
            }
          >
            <ProductsContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
} 