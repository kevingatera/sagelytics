"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import PricingDashboard from "~/components/pricing-dashboard"
import { type Session } from "next-auth"
import { useEffect } from "react"

export default function HomeClient({ session }: { session: Session }) {
  const router = useRouter()
  const { data: clientSession, status } = useSession()

  useEffect(() => {
    if (status === "authenticated" && !clientSession.user?.onboardingCompleted) {
      router.push('/onboarding')
    }
  }, [status, clientSession?.user?.onboardingCompleted, router, session.user.onboardingCompleted])

  if (status === "loading") return <div>Loading...</div>
  if (status === "unauthenticated") return null

  return <PricingDashboard />
} 