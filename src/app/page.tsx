import PricingDashboard from "~/components/pricing-dashboard"
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server"

console.log("Before Home");

export default async function Home() {
  console.log("Home");
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }
  return (
    <HydrateClient>
      <PricingDashboard />
    </HydrateClient>
  );
}
