import { parseDomainVerdicts, selectApprovedCandidates } from './strict-filter-output';

// Finding 2: strict-filter output is validated, intersected with what was submitted, and capped.
type Candidate = { domain: string; source: string; reason?: string };

const pool: Candidate[] = [
  { domain: 'rival.com', source: 'perplexity', reason: 'serp reason' },
  { domain: 'other-lodge.com', source: 'serp' },
  { domain: 'tripadvisor.com', source: 'serp' },
];
const eligible = (domain: string): boolean => domain !== 'tripadvisor.com';

describe('parseDomainVerdicts', () => {
  it('rejects output whose competitors field is not a list', () => {
    expect(() => parseDomainVerdicts({ competitors: 'rival.com' })).toThrow(
      /failed validation/,
    );
  });

  it('rejects output without a competitors field', () => {
    expect(() => parseDomainVerdicts({ excluded: [] })).toThrow(/failed validation/);
  });

  it('accepts a null reason as no reason', () => {
    expect(
      parseDomainVerdicts({ competitors: [{ domain: 'rival.com', reason: null }] }),
    ).toEqual([{ domain: 'rival.com', reason: undefined }]);
  });
});

describe('selectApprovedCandidates', () => {
  it('keeps only submitted domains and ignores invented ones', () => {
    const approved = selectApprovedCandidates(
      [
        { domain: 'invented-lodge.com', reason: 'not submitted' },
        { domain: 'rival.com', reason: 'direct' },
      ],
      pool,
      eligible,
      12,
    );

    expect(approved.map((candidate) => candidate.domain)).toEqual(['rival.com']);
    expect(approved[0].reason).toBe('direct');
    expect(approved[0].source).toBe('perplexity');
  });

  it('reapplies eligibility to domains the filter names', () => {
    const approved = selectApprovedCandidates(
      [{ domain: 'tripadvisor.com', reason: 'directory' }],
      pool,
      eligible,
      12,
    );

    expect(approved).toEqual([]);
  });

  it('counts each normalized domain once', () => {
    const approved = selectApprovedCandidates(
      [
        { domain: 'https://www.Rival.com/' },
        { domain: 'rival.com' },
        { domain: 'other-lodge.com' },
      ],
      pool,
      eligible,
      12,
    );

    expect(approved.map((candidate) => candidate.domain)).toEqual([
      'rival.com',
      'other-lodge.com',
    ]);
  });

  it('applies the cap while selecting, before the caller thresholds the result', () => {
    const many: Candidate[] = Array.from({ length: 20 }, (_, index) => ({
      domain: `rival-${index}.com`,
      source: 'serp',
    }));

    const approved = selectApprovedCandidates(
      many.map((candidate) => ({ domain: candidate.domain })),
      many,
      () => true,
      12,
    );

    expect(approved).toHaveLength(12);
  });
});
