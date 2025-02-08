import { auth } from "~/server/auth"
import { db } from "~/server/db"
import { userOnboarding, users } from "~/server/db/schema"
import { NextResponse } from "next/server"
import { z } from "zod"
import { discoverCompetitors } from "~/lib/competitor-discovery"
import { eq } from "drizzle-orm"

const optionalUrl = z.preprocess(
  (a) => typeof a === "string" && a.trim() === "" ? undefined : a,
  z.string().url().optional()
)

const schema = z.object({
  companyDomain: z.string().url(),
  productCatalog: optionalUrl,
  competitor1: optionalUrl,
  competitor2: optionalUrl,
  competitor3: optionalUrl,
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  
  const input = await req.json()  
  const parsed = schema.safeParse(input)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input data" }, { status: 400 })
  }

  const { companyDomain, productCatalog, competitor1, competitor2, competitor3 } = parsed.data
  const userCompetitors = [competitor1, competitor2, competitor3].filter(Boolean) as string[]
  const finalCompetitors = userCompetitors.length > 0 
    ? userCompetitors
    : await discoverCompetitors(companyDomain, [])

  await db.insert(userOnboarding).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    companyDomain,
    productCatalogUrl: productCatalog,
    knownCompetitors: finalCompetitors,
    completed: true
  })

  await db.update(users)
    .set({ onboardingCompleted: true })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ success: true })
} 