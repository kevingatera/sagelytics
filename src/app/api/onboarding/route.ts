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

const onboardingSchema = z.object({
  companyDomain: z.string().url(),
  productCatalog: z.string().url().optional().or(z.literal('')),
  competitor1: z.string().optional().default(''),
  competitor2: z.string().optional().default(''),
  competitor3: z.string().optional().default(''),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  businessType: z.enum(['ecommerce', 'saas', 'marketplace', 'other']),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return Response.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const data = onboardingSchema.parse(body);

    // Collect known competitors from the form
    const knownCompetitors = [data.competitor1, data.competitor2, data.competitor3]
      .filter((comp): comp is string => comp !== undefined && comp !== '');

    // Check if onboarding record already exists
    const existingOnboarding = await db.query.userOnboarding.findFirst({
      where: eq(userOnboarding.userId, session.user.id),
    });

    if (existingOnboarding) {
      // Update existing record
      await db.update(userOnboarding)
        .set({
          companyDomain: data.companyDomain,
          productCatalogUrl: data.productCatalog ?? null,
          businessType: data.businessType,
          identifiedCompetitors: knownCompetitors,
          completed: true,
        })
        .where(eq(userOnboarding.userId, session.user.id));
    } else {
      // Create new onboarding record
      await db.insert(userOnboarding).values({
        id: `onboarding_${session.user.id}_${Date.now()}`,
        userId: session.user.id,
        companyDomain: data.companyDomain,
        productCatalogUrl: data.productCatalog ?? null,
        businessType: data.businessType,
        identifiedCompetitors: knownCompetitors,
        completed: true,
      });
    }

    // Mark user as having completed onboarding
    await db.update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, session.user.id));
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: 'Invalid onboarding data', issues: error.issues },
        { status: 400 }
      );
    }
    
    return Response.json(
      { message: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
