import { Suspense } from "react";
// import { api } from "~/trpc/server";
import { ProductTableClient } from "./ProductTableClient";

export async function ProductTable() {
  // const products = await api.competitor.getProducts();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* TODO: Fix type mismatch - component appears unused */}
      {/* <ProductTableClient products={products} /> */}
      <div>ProductTable component disabled due to type issues</div>
    </Suspense>
  );
}
