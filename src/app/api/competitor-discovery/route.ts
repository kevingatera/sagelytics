import { auth } from "~/auth";
import { MicroserviceClient } from "~/lib/services/microservice-client";
import { type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { domain, businessType, knownCompetitors, productCatalogUrl } = body;

    if (!domain || !businessType || !productCatalogUrl) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = MicroserviceClient.getInstance();
    const result = await client.discoverCompetitors({
      domain,
      userId: session.user.id,
      businessType,
      knownCompetitors,
      productCatalogUrl,
    });

    return Response.json(result);
  } catch (error) {
    console.error("Error discovering competitors:", error);
    return Response.json(
      { error: "Failed to discover competitors" },
      { status: 500 }
    );
  }
} 