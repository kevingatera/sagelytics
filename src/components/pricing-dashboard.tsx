"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { api } from "~/trpc/react"
import { Switch } from "~/components/ui/switch"
import { Label } from "~/components/ui/label"
import { Button } from "~/components/ui/button"
import { CompetitorManagement } from "~/components/competitor-management"
import { StatsCards } from "~/components/dashboard/stats-cards"
import { SalesOverview } from "~/components/dashboard/sales-overview"
import { PricingStrategy } from "~/components/dashboard/pricing-strategy"
import { AIInsights } from "~/components/dashboard/ai-insights"
import { PriceComparison } from "~/components/dashboard/price-comparison"
import { ProductMatching } from "~/components/dashboard/product-matching"
import type { DashboardData } from "~/lib/types/dashboard"

export default function PricingDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  const { data: result, error } = api.competitor.get.useQuery<DashboardData>()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
    if (session && !session.user.onboardingCompleted) {
      router.push("/onboarding")
    }
    if (error?.data?.code === 'NOT_FOUND') {
      router.push('/onboarding')
    }
  }, [status, session, error, router])

  if (status === "loading" || !result) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Pricing Strategy Dashboard</h1>
          <div className="flex items-center space-x-4">
            {mounted && (
              <>
                <Label htmlFor="dark-mode-toggle">Dark Mode</Label>
                <Switch
                  id="dark-mode-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
                />
              </>
            )}
            <Button variant="outline" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>

        <StatsCards competitors={result.competitors} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompetitorManagement />
          <SalesOverview data={result} />
          <PricingStrategy data={result} />
        </div>

        <AIInsights insights={result.insights} />
        <PriceComparison priceData={result.priceData} />
        <ProductMatching competitors={result.competitors} />
      </div>
    </div>
  )
}

