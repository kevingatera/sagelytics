import { NextResponse } from "next/server"
import { auth } from "~/server/auth"
import { db } from "~/server/db"
import { userOnboarding } from "~/server/db/schema"
import { eq } from "drizzle-orm"

// Mock data - replace with real data later
const competitorPriceData = {
  labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
  datasets: [
    {
      label: "Your Price",
      data: [100, 105, 102, 108],
      borderColor: "rgb(53, 162, 235)",
      backgroundColor: "rgba(53, 162, 235, 0.5)",
    },
    {
      label: "Competitor A",
      data: [98, 103, 106, 105],
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.5)",
    },
    {
      label: "Competitor B",
      data: [102, 100, 104, 106],
      borderColor: "rgb(75, 192, 192)",
      backgroundColor: "rgba(75, 192, 192, 0.5)",
    },
  ],
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const onboardingData = await db.query.userOnboarding.findFirst({
    where: eq(userOnboarding.userId, session.user.id)
  })

  return NextResponse.json({
    competitors: onboardingData?.identifiedCompetitors || [],
    priceData: competitorPriceData // Mock data, replace with real DB query
  })
} 