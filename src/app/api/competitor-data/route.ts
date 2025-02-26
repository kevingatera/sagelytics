import { NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userCompetitors, type UserCompetitor } from '~/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userCompetitorsList = (await db.query.userCompetitors.findMany({
    where: eq(userCompetitors.userId, session.user.id),
    with: { competitor: true },
  })) as UserCompetitor[];

  const competitors = userCompetitorsList.map((uc) => uc.competitor.domain);

  // Mock data - replace with real data later
  const priceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        label: 'Your Price',
        data: [100, 105, 102, 108],
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      ...competitors.map((_, index) => ({
        label: competitors[index],
        data: [98, 103, 106, 105].map((n) => n + Math.random() * 5),
        borderColor: `rgb(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100})`,
        backgroundColor: `rgba(${index * 50 + 100}, ${index * 30 + 100}, ${index * 40 + 100}, 0.5)`,
      })),
    ],
  };

  return NextResponse.json({
    competitors,
    priceData,
  });
}
