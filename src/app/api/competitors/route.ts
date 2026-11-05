import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userCompetitors, userOnboarding } from '~/server/db/schema';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { z } from 'zod';
import type { CompetitorInsight } from '@shared/types';
import { toCompetitorMetadata } from '~/server/db/competitor-analysis';
import { persistCompetitorForUser } from '~/server/db/competitor-analysis';
import {
  createCompetitorAnalysisStore,
  getUserCompetitorMetadata,
} from '~/server/db/queries/competitor-analysis';

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
    // Get user's competitors with this user's analysis merged onto the shared row
    const userCompetitorsList = await db.query.userCompetitors.findMany({
      where: eq(userCompetitors.userId, session.user.id),
      with: { competitor: true, analysis: true },
    });

    const competitors = userCompetitorsList.map((uc) => ({
      id: uc.competitor.id,
      domain: uc.competitor.domain,
      metadata: toCompetitorMetadata(uc.competitor.metadata, uc.analysis?.metadata ?? null),
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

  try {
    const microserviceClient = MicroserviceClient.getInstance();
    const catalog = await microserviceClient.discoverWebsiteContent(
      existingOnboarding.productCatalogUrl,
    );
    const userProducts = Array.isArray(catalog.products)
      ? catalog.products.map((product) => ({
          name: product.name,
          description: product.description ?? '',
          url: product.url ?? undefined,
          price: product.price ?? undefined,
          currency: product.currency ?? undefined,
        }))
      : [];

    const competitorInsight = await microserviceClient.analyzeCompetitor({
      competitorDomain: domain,
      businessContext: {
        domain: existingOnboarding.companyDomain,
        businessType: existingOnboarding.businessType ?? '',
        products: userProducts,
      },
    });
    const typedInsight: Partial<CompetitorInsight> = competitorInsight;

    await persistCompetitorForUser(createCompetitorAnalysisStore(db), {
      userId: session.user.id,
      domain,
      insight: typedInsight,
      relationshipStrength: Math.max(
        1,
        Math.min(5, Math.round((typedInsight.matchScore ?? 0) / 20)),
      ),
    });

    const saved = await getUserCompetitorMetadata(db, session.user.id, domain);
    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to save competitor analysis' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      competitor: {
        id: saved.id,
        domain: saved.domain,
        metadata: saved.metadata,
      },
    });
  } catch (error) {
    console.error('Error analyzing competitor:', error);
    return NextResponse.json(
      { error: 'Failed to analyze competitor' },
      { status: 500 },
    );
  }
}
