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

    
    
    // Store onboarding data in the database
    // In a real app, this would likely go into separate tables
    // For simplicity, we'll just mark the user as having completed onboarding
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
