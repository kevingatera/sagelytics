import { and, eq } from 'drizzle-orm';
import type { db } from '~/server/db';
import {
  competitors,
  userCompetitorAnalysis,
  userCompetitors,
} from '~/server/db/schema';
import {
  toCompetitorMetadata,
  type CompetitorAnalysisStore,
  type CompetitorMetadata,
} from '~/server/db/competitor-analysis';

type Database = typeof db;

export function createCompetitorAnalysisStore(database: Database): CompetitorAnalysisStore {
  return {
    async findCompetitorByDomain(domain) {
      const row = await database.query.competitors.findFirst({
        where: eq(competitors.domain, domain),
      });
      return row ? { id: row.id, metadata: row.metadata } : null;
    },

    async upsertCompetitor(domain, metadata) {
      const [row] = await database
        .insert(competitors)
        .values({ domain, metadata })
        .onConflictDoUpdate({
          target: competitors.domain,
          set: { metadata, updatedAt: new Date() },
        })
        .returning({ id: competitors.id });
      if (!row) throw new Error(`Failed to save competitor ${domain}`);
      return { id: row.id };
    },

    async upsertUserAnalysis(userId, competitorId, analysis) {
      const now = new Date();
      await database
        .insert(userCompetitorAnalysis)
        .values({ userId, competitorId, metadata: analysis, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: [userCompetitorAnalysis.userId, userCompetitorAnalysis.competitorId],
          set: { metadata: analysis, updatedAt: now },
        });
    },

    async linkUser(userId, competitorId, relationshipStrength) {
      await database
        .insert(userCompetitors)
        .values({ userId, competitorId, relationshipStrength })
        .onConflictDoNothing();
    },
  };
}

/** The read view one user sees for one competitor, or null if the user is not linked. */
export async function getUserCompetitorMetadata(
  database: Database,
  userId: string,
  domain: string,
): Promise<{ id: string; domain: string; metadata: CompetitorMetadata } | null> {
  const competitor = await database.query.competitors.findFirst({
    where: eq(competitors.domain, domain),
  });
  if (!competitor) return null;

  const analysis = await database.query.userCompetitorAnalysis.findFirst({
    where: and(
      eq(userCompetitorAnalysis.userId, userId),
      eq(userCompetitorAnalysis.competitorId, competitor.id),
    ),
  });

  return {
    id: competitor.id,
    domain: competitor.domain,
    metadata: toCompetitorMetadata(competitor.metadata, analysis?.metadata ?? null),
  };
}
