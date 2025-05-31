import { Suspense } from "react";
import { api } from "~/trpc/server";
import { ProductTableClient } from "./ProductTableClient";

export async function ProductTable() {
  const products = await api.competitor.getProducts();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductTableClient products={products} />
    </Suspense>
  );
}
