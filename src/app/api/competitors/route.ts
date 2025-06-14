import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userOnboarding, userCompetitors } from '~/server/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { z } from 'zod';

const schema = z.object({
  url: z.string().transform((url) => {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      throw new Error('Invalid URL');
    }
  }),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get user's competitors
    const userCompetitorsList = await db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, session.user.id),
      with: { competitor: true },
    });

    const competitors = userCompetitorsList.map((uc) => ({
      id: uc.competitor.id,
      domain: uc.competitor.domain,
      metadata: uc.competitor.metadata,
    }));

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  const domain = parsed.data.url;

  const existingOnboarding = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id),
  });

  if (!existingOnboarding) {
    return NextResponse.json({ error: 'Complete onboarding first' }, { status: 400 });
  }

  if (!existingOnboarding.productCatalogUrl) {
    return NextResponse.json({ error: 'Product catalog URL is required' }, { status: 400 });
  }

  const result = await MicroserviceClient.getInstance().discoverCompetitors({
    domain,
    userId: session.user.id,
    businessType: existingOnboarding.businessType,
    knownCompetitors: [],
    productCatalogUrl: existingOnboarding.productCatalogUrl,
  });

  return NextResponse.json({
    success: true,
    ...result,
  });
}
