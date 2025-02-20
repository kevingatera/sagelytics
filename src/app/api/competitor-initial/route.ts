import { NextResponse } from "next/server"
import { auth } from "~/server/auth"
import { db } from "~/server/db"
import { userOnboarding } from "~/server/db/schema"
import { eq } from "drizzle-orm"
import { MicroserviceClient } from "~/lib/services/microservice-client"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const onboardingData = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id)
  })

  if (!onboardingData) {
    return NextResponse.json({ error: "Onboarding not completed" }, { status: 400 })
  }

  if (!onboardingData.productCatalogUrl) {
    return NextResponse.json({ error: "Product catalog URL is required" }, { status: 400 })
  }

  const competitors = onboardingData.identifiedCompetitors || []
  const additionalCompetitors = await MicroserviceClient.getInstance().discoverCompetitors({
    domain: onboardingData.companyDomain,
    userId: session.user.id,
    businessType: onboardingData.businessType,
    knownCompetitors: competitors,
    productCatalogUrl: onboardingData.productCatalogUrl
  })

  await db.update(userOnboarding)
    .set({ identifiedCompetitors: additionalCompetitors.competitors.map(c => c.domain) })
    .where(eq(userOnboarding.userId, session.user.id))

  return NextResponse.json({
    competitors: additionalCompetitors
  })
} 