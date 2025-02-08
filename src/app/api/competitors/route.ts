import { auth } from "~/server/auth"
import { db } from "~/server/db"
import { userOnboarding } from "~/server/db/schema"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { discoverCompetitors } from "~/lib/competitor-discovery"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const { domain, competitors } = await req.json()
  
  if (!domain || !competitors?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  
  const existingOnboarding = await db.select()
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, session.user.id));

  if (!existingOnboarding.length) {
    return NextResponse.json({ error: "Complete onboarding first" }, { status: 400 });
  }
  
  // Mock LLM competitor discovery
  const additionalCompetitors = await discoverCompetitors(domain, competitors)
  
  await db.update(userOnboarding)
    .set({
      identifiedCompetitors: additionalCompetitors
    })
    .where(eq(userOnboarding.userId, session.user.id))
  
  return NextResponse.json({ success: true })
}

async function mockLLMCompetitorDiscovery(domain: string, competitors: string[]) {
  // In real implementation, call LLM API here
  return [
    "competitor4.com",
    "competitor5.shop",
    "competitor6.store"
  ]
} 