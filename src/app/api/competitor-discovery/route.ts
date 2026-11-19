import { requireWriteSession } from '~/server/auth';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { type NextRequest } from 'next/server';
import { isBillingLimitError, recordDiscoveryUsage, releaseDiscoveryUsage } from '~/server/billing';

export async function POST(req: NextRequest) {
  try {
    const write = await requireWriteSession();
    if (!write.ok) return write.response;
    const session = write.session;
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as {
      domain: string;
      businessType: string;
      knownCompetitors: string[];
      productCatalogUrl: string;
    };

    if (!body.domain || !body.businessType || !body.productCatalogUrl) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let usageId: string;
    try {
      ({ usageId } = await recordDiscoveryUsage(session.user.id, body.domain));
    } catch (error) {
      if (isBillingLimitError(error)) return Response.json(error.toJSON(), { status: 402 });
      throw error;
    }

    const client = MicroserviceClient.getInstance();
    let result: Awaited<ReturnType<typeof client.discoverCompetitors>>;
    try {
      result = await client.discoverCompetitors({
        domain: body.domain,
        userId: session.user.id,
        businessType: body.businessType,
        knownCompetitors: body.knownCompetitors,
        productCatalogUrl: body.productCatalogUrl,
      });
    } catch (error) {
      await releaseDiscoveryUsage(session.user.id, usageId).catch((releaseError: unknown) => {
        console.error('Failed to release discovery usage:', releaseError);
      });
      throw error;
    }

    return Response.json(result);
  } catch (error) {
    console.error('Error discovering competitors:', error);
    return Response.json(
      { error: 'Failed to discover competitors' },
      { status: 500 },
    );
  }
}
