import { auth } from "~/server/auth"
import { db } from "~/server/db"
import { userOnboarding } from "~/server/db/schema"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { discoverCompetitors } from "~/lib/competitor-discovery"
import { z } from "zod"

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
  })
});

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const body = await req.json()
  const parsed = schema.safeParse(body)
  
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
  }
  
  const domain = parsed.data.url;
  
  const existingOnboarding = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id)
  });

  if (!existingOnboarding) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }

  if (!existingOnboarding.productCatalogUrl) {
    return NextResponse.json({ error: "Product catalog URL is required" }, { status: 400 });
  }
  
  const result = await discoverCompetitors(
    domain, 
    session.user.id,
    existingOnboarding.businessType,
    [],
    existingOnboarding.productCatalogUrl
  )
  
  return NextResponse.json({ 
    success: true,
    ...result
  })
}

async function mockLLMCompetitorDiscovery(domain: string, competitors: string[]) {
  // In real implementation, call LLM API here
  return [
    "competitor4.com",
    "competitor5.shop",
    "competitor6.store"
  ]
} 