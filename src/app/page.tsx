import { auth } from '~/server/auth';
import { HydrateClient } from '~/trpc/server';
import HomeClient from './home-client';
import { LandingPage } from '~/components/landing-page';

console.log('Before Home');

export default async function Home() {
  console.log('Home');
  const session = await auth();

  if (session?.user) {
    return (
      <HydrateClient>
        <HomeClient session={session} />
      </HydrateClient>
    );
  }

  return <LandingPage />;
}
