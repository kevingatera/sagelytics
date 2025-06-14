import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userProducts } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get user's products
    const userProductsList = await db.query.userProducts.findMany({
      where: eq(userProducts.userId, session.user.id),
    });

    const products = userProductsList.map((product) => ({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      currency: 'USD', // Default currency since it's not stored in the schema
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
} 