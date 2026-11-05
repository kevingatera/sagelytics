import { z } from 'zod';
import { normalizeDomain } from '../../common/utils/domain';

const DomainVerdictsSchema = z.object({
  competitors: z.array(
    z.object({
      domain: z.string(),
      reason: z.string().nullish(),
    }),
  ),
});

export type DomainVerdict = { domain: string; reason?: string };

/** Throws when provider output does not match the expected shape, so the caller falls back. */
export function parseDomainVerdicts(raw: unknown): DomainVerdict[] {
  const parsed = DomainVerdictsSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Competitor output failed validation: ${issue?.path.join('.') || 'root'} ${issue?.message ?? 'is invalid'}`,
    );
  }
  return parsed.data.competitors.map((item) => ({
    domain: item.domain,
    reason: item.reason ?? undefined,
  }));
}

/**
 * Keeps only verdicts that name a submitted candidate passing `isEligible`. Each domain counts once,
 * and the result stops at `limit`, so the escalation threshold sees validated domains only.
 */
export function selectApprovedCandidates<C extends { domain: string; reason?: string }>(
  verdicts: DomainVerdict[],
  pool: C[],
  isEligible: (domain: string) => boolean,
  limit: number,
): C[] {
  const submitted = new Map(pool.map((candidate) => [candidate.domain, candidate] as const));
  const seen = new Set<string>();
  const approved: C[] = [];

  for (const verdict of verdicts) {
    const domain = normalizeDomain(verdict.domain);
    if (!domain || seen.has(domain)) {
      continue;
    }
    seen.add(domain);

    const base = submitted.get(domain);
    if (!base || !isEligible(domain)) {
      continue;
    }
    approved.push({ ...base, reason: verdict.reason ?? base.reason });
    if (approved.length >= limit) {
      break;
    }
  }

  return approved;
}
