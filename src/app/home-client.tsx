"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import PricingDashboard from "~/components/pricing-dashboard"
import { type Session } from "next-auth"

export default function HomeClient({ session }: { session: Session }) {
  const router = useRouter()
  const { data: clientSession } = useSession()

  if (clientSession?.user) {
    const needsOnboarding = true // Replace with actual onboarding check
    if (needsOnboarding) {
      router.push('/onboarding')
      return null
    }
  }

  return <PricingDashboard />
} 