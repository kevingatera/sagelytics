import { NextResponse } from 'next/server';

import { auth } from '~/server/auth';
import { billingStore } from '~/server/billing';
import { createCheckoutSession } from '~/server/billing/checkout';
import { getBillingConfig } from '~/server/billing/config';
import { getStripe } from '~/server/billing/stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await createCheckoutSession(
      { id: session.user.id, email: session.user.email, name: session.user.name },
      { stripe: getStripe, store: billingStore, config: getBillingConfig() },
    );
    if (!result.ok) {
      const body = result.portalUrl
        ? { error: result.error, portalUrl: result.portalUrl }
        : { error: result.error };
      return NextResponse.json(body, { status: result.status });
    }
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('[BILLING] Failed to create checkout session:', error);
    return NextResponse.json({ error: 'Failed to start checkout' }, { status: 500 });
  }
}
