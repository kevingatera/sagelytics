import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Condition = { col: string; value: unknown };

const state = vi.hoisted(() => {
  const ops = {
    and: (...conditions: Array<{ col: string; value: unknown }>) => conditions,
    eq: (col: string, value: unknown) => ({ col, value }),
  };
  return {
    session: null as null | { user: { id: string } },
    existingSkus: [] as string[],
    ops,
    insert: vi.fn(),
    update: vi.fn(),
  };
});

vi.mock('~/server/auth', () => ({
  auth: vi.fn(async () => state.session),
}));

vi.mock('~/server/db', () => ({
  db: {
    query: {
      userProducts: {
        findFirst: vi.fn(async ({ where }: { where: (table: Record<string, string>, ops: typeof state.ops) => Condition[] }) => {
          const conditions = where({ userId: 'userId', sku: 'sku' }, state.ops);
          const sku = conditions.find((condition) => condition.col === 'sku')?.value;
          return typeof sku === 'string' && state.existingSkus.includes(sku) ? { id: 'existing-product' } : undefined;
        }),
      },
      competitors: { findFirst: vi.fn(async () => undefined) },
      userCompetitors: { findFirst: vi.fn(async () => undefined) },
    },
    insert: state.insert,
    update: state.update,
  },
}));

import { POST } from './route';

const PRODUCT_HEADER = 'name,sku,price,category';

function importRequest(fields: Record<string, string>, csv?: string) {
  const form = new FormData();
  if (csv !== undefined) {
    form.append('file', new File([csv], 'upload.csv', { type: 'text/csv' }));
  }
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  return new NextRequest('http://localhost/api/data/import', { method: 'POST', body: form });
}

function previewFields(type: string, extra: Record<string, string> = {}) {
  return { type, format: 'csv', overwrite: 'false', dryRun: 'true', ...extra };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.session = { user: { id: 'user-1' } };
  state.existingSkus = ['SKU-EXISTING'];
  state.insert.mockImplementation(() => ({
    values: () => ({
      onConflictDoUpdate: async () => undefined,
      onConflictDoNothing: async () => undefined,
      returning: async () => [{ id: 'new-competitor' }],
    }),
  }));
});

describe('POST /api/data/import with dryRun', () => {
  it('rejects a request without a session', async () => {
    state.session = null;

    const res = await POST(importRequest(previewFields('products'), `${PRODUCT_HEADER}\nA,A-1,10,x`));

    expect(res.status).toBe(401);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('reports real row counts and errors for products without writing', async () => {
    const csv = [
      PRODUCT_HEADER,
      'Alpha,SKU-1,10,goods',
      'Beta,,12,goods',
      'Gamma,SKU-EXISTING,14,goods',
      'Delta,SKU-4,16,goods',
    ].join('\n');

    const res = await POST(importRequest(previewFields('products'), csv));
    const body = (await res.json()) as {
      totalRows: number;
      validRows: number;
      errors: Array<{ row: number; field: string; message: string }>;
      sampleData: Array<{ name: string; sku: string }>;
    };

    expect(res.status).toBe(200);
    expect(body.totalRows).toBe(4);
    expect(body.validRows).toBe(2);
    expect(body.errors).toEqual([
      { row: 2, field: 'sku', message: 'Missing required fields (name, sku, price)' },
      { row: 3, field: 'sku', message: "Product with SKU 'SKU-EXISTING' already exists" },
    ]);
    expect(body.sampleData.map((row) => row.sku)).toEqual(['SKU-1', 'SKU-4']);
    expect(state.insert).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });

  it('caps errors at 20 and samples at 5', async () => {
    const valid = Array.from({ length: 8 }, (_, i) => `Item ${i},SKU-V${i},5,goods`);
    const invalid = Array.from({ length: 25 }, () => 'Nameless,,5,goods');
    const csv = [PRODUCT_HEADER, ...valid, ...invalid].join('\n');

    const res = await POST(importRequest(previewFields('products'), csv));
    const body = (await res.json()) as { totalRows: number; validRows: number; errors: unknown[]; sampleData: unknown[] };

    expect(body.totalRows).toBe(33);
    expect(body.validRows).toBe(8);
    expect(body.errors).toHaveLength(20);
    expect(body.sampleData).toHaveLength(5);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('matches the counts a real import reports for the same file', async () => {
    const csv = [PRODUCT_HEADER, 'Alpha,SKU-1,10,goods', 'Beta,,12,goods', 'Gamma,SKU-EXISTING,14,goods'].join('\n');

    const previewRes = await POST(importRequest(previewFields('products'), csv));
    const preview = (await previewRes.json()) as { validRows: number; errors: unknown[] };

    const importRes = await POST(importRequest({ type: 'products', format: 'csv', overwrite: 'false' }, csv));
    const imported = (await importRes.json()) as { imported: number; errors: number };

    expect(imported.imported).toBe(preview.validRows);
    expect(imported.errors).toBe(preview.errors.length);
    expect(state.insert).toHaveBeenCalledTimes(1);
  });

  it('previews competitors, cleaning domains, without creating rows', async () => {
    const csv = ['domain,name', 'https://www.Rival.example/,Rival', ',No domain'].join('\n');

    const res = await POST(importRequest(previewFields('competitors'), csv));
    const body = (await res.json()) as {
      validRows: number;
      errors: Array<{ row: number; field: string }>;
      sampleData: Array<{ domain: string }>;
    };

    expect(body.validRows).toBe(1);
    expect(body.errors).toEqual([expect.objectContaining({ row: 2, field: 'domain' })]);
    expect(body.sampleData[0]?.domain).toBe('Rival.example');
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('reports sales as not yet importable instead of counting valid rows', async () => {
    const csv = ['date,product_sku,quantity,revenue', '2026-01-01,SKU-1,2,20'].join('\n');

    const res = await POST(importRequest(previewFields('sales'), csv));
    const body = (await res.json()) as { validRows: number; errors: Array<{ message: string }> };

    expect(body.validRows).toBe(0);
    expect(body.errors[0]?.message).toBe('Sales import not yet implemented');
    expect(state.insert).not.toHaveBeenCalled();
  });
});
