import { NextResponse } from 'next/server';

import { auth } from '~/server/auth';
import { billingStore } from '~/server/billing';
import { createPortalSession } from '~/server/billing/checkout';
import { getBillingConfig } from '~/server/billing/config';
import { getStripe } from '~/server/billing/stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await createPortalSession(
      { id: session.user.id, email: session.user.email, name: session.user.name },
      { stripe: getStripe, store: billingStore, config: getBillingConfig() },
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('[BILLING] Failed to create portal session:', error);
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 });
  }
}
