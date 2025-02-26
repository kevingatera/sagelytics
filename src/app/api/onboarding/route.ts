import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, users } from '~/server/db/schema';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
const optionalUrl = z.preprocess(
  (a) => (typeof a === 'string' && a.trim() === '' ? undefined : a),
  z.string().url().optional(),
);

const schema = z.object({
  companyDomain: z.string().url(),
  productCatalog: z.string().url(),
  competitor1: optionalUrl,
  competitor2: optionalUrl,
  competitor3: optionalUrl,
  businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const input = (await req.json()) as z.infer<typeof schema>;
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const errorMessage =
      parsed.error.issues.find((i) => i.path.includes('productCatalog'))?.message ??
      'Invalid input data';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  const { companyDomain, productCatalog, competitor1, competitor2, competitor3, businessType } =
    parsed.data;
  const userCompetitors = [competitor1, competitor2, competitor3].filter(Boolean) as string[];
  const discoveryResult = await MicroserviceClient.getInstance().discoverCompetitors({
    domain: companyDomain,
    userId: session.user.id,
    businessType,
    knownCompetitors: userCompetitors,
    productCatalogUrl: productCatalog,
  });

  await db.insert(userOnboarding).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    companyDomain,
    productCatalogUrl: productCatalog,
    businessType,
    identifiedCompetitors: discoveryResult.competitors.map((c) => c.domain),
    completed: true,
  });

  await db.update(users).set({ onboardingCompleted: true }).where(eq(users.id, session.user.id));

  return NextResponse.json({
    success: true,
    ...discoveryResult,
  });
}
