import { eq } from 'drizzle-orm';
import type { Product } from '@shared/types';
import type { db } from '~/server/db';
import { userProducts } from '~/server/db/schema';
import { MicroserviceClient } from '~/lib/services/microservice-client';

export async function getStoredCatalog(database: typeof db, userId: string): Promise<Product[]> {
  const products = await database.query.userProducts.findMany({
    where: eq(userProducts.userId, userId),
    columns: { name: true, description: true, price: true },
  });
  return products.map(({ name, description, price }) => ({
    name,
    description: description ?? undefined,
    price: Number(price) > 0 ? Number(price) : undefined,
  }));
}

export async function loadCatalog(
  stored: Product[],
  catalogUrl: string | null,
  deadlineAt: number,
): Promise<Product[]> {
  if (stored.length || !catalogUrl) return stored;
  const result = await MicroserviceClient.getInstance().discoverWebsiteContent(
    catalogUrl,
    deadlineAt,
  );
  return (result.products ?? []).map((product) => ({
    name: product.name,
    description: product.description ?? '',
    url: product.url ?? undefined,
    price: product.price ?? undefined,
    currency: product.currency ?? undefined,
  }));
}
