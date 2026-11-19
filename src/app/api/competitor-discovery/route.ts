import { auth } from '~/server/auth';
import { MicroserviceClient } from '~/lib/services/microservice-client';
import { type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
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

    const client = MicroserviceClient.getInstance();
    const result = await client.discoverCompetitors({
      domain: body.domain,
      userId: session.user.id,
      businessType: body.businessType,
      knownCompetitors: body.knownCompetitors,
      productCatalogUrl: body.productCatalogUrl,
    });

    return Response.json(result);
  } catch (error) {
    console.error('Error discovering competitors:', error);
    return Response.json(
      { error: 'Failed to discover competitors' },
      { status: 500 },
    );
  }
}
