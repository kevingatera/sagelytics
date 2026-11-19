import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { userProducts, competitors, userCompetitors } from '~/server/db/schema';
import { z } from 'zod';
import { parseCSV, parseXLSX, parseJSON } from '~/lib/file-parsers';

const importRequestSchema = z.object({
  type: z.enum(['products', 'competitors', 'sales', 'inventory']),
  format: z.enum(['csv', 'xlsx', 'json']),
  overwrite: z.boolean().default(false),
});

const PREVIEW_ERROR_LIMIT = 20;
const PREVIEW_SAMPLE_LIMIT = 5;

type ImportType = 'products' | 'competitors' | 'sales' | 'inventory';

interface ImportResult {
  imported: number;
  errors: number;
  errorDetails: string[];
}

interface ImportPreview {
  totalRows: number;
  validRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
  sampleData: unknown[];
}

type RowCheck<T> = { ok: true; data: T } | { ok: false; field: string; message: string };

interface ProductImportData {
  name: string;
  sku: string;
  price: number;
  category: string;
  description?: string;
  stock?: number;
}

interface CompetitorImportData {
  domain: string;
  name?: string;
  industry?: string;
  notes?: string;
}

interface CompetitorRowData {
  competitor: CompetitorImportData;
  existingCompetitorId: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const format = formData.get('format') as string;
    const overwrite = formData.get('overwrite') === 'true';
    const dryRun = formData.get('dryRun') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate request data
    const validatedData = importRequestSchema.parse({ type, format, overwrite });

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Parse file based on format
    let parsedData: Record<string, string>[];
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(fileBuffer);

    try {
      switch (validatedData.format) {
        case 'csv':
          parsedData = await parseCSV(fileContent);
          break;
        case 'xlsx':
          parsedData = await parseXLSX(fileContent);
          break;
        case 'json':
          parsedData = await parseJSON(fileContent);
          break;
        default:
          throw new Error('Unsupported file format');
      }
    } catch (error) {
      return NextResponse.json({ 
        error: 'Failed to parse file', 
        details: error instanceof Error ? error.message : 'Unknown parsing error' 
      }, { status: 400 });
    }

    // Dry run: same validation as a real import, no writes
    if (dryRun) {
      const preview = await previewImport(validatedData.type, session.user.id, parsedData, overwrite);
      return NextResponse.json(preview);
    }

    // Process data based on type
    let result: ImportResult;
    switch (validatedData.type) {
      case 'products':
        result = await importProducts(session.user.id, parsedData, overwrite);
        break;
      case 'competitors':
        result = await importCompetitors(session.user.id, parsedData, overwrite);
        break;
      case 'sales':
        result = await importSales(session.user.id, parsedData, overwrite);
        break;
      case 'inventory':
        result = await importInventory(session.user.id, parsedData, overwrite);
        break;
      default:
        return NextResponse.json({ error: 'Unsupported data type' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      error: 'Import failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

function checkProductRow(row: Record<string, string>): RowCheck<ProductImportData> {
  const productData: ProductImportData = {
    name: row.name ?? row.product_name ?? row.title ?? '',
    sku: row.sku ?? row.product_id ?? '',
    price: parseFloat(row.price ?? row.cost ?? row.amount ?? '0'),
    category: row.category ?? row.type ?? 'uncategorized',
    description: row.description ?? row.desc,
    stock: row.stock ? parseInt(row.stock) : undefined,
  };

  // Validate required fields
  if (!productData.name || !productData.sku || !productData.price) {
    const field = !productData.name ? 'name' : !productData.sku ? 'sku' : 'price';
    return { ok: false, field, message: 'Missing required fields (name, sku, price)' };
  }

  return { ok: true, data: productData };
}

async function validateProductRow(
  userId: string,
  row: Record<string, string>,
  overwrite: boolean,
): Promise<RowCheck<ProductImportData>> {
  const checked = checkProductRow(row);
  if (!checked.ok || overwrite) return checked;

  const existingProduct = await db.query.userProducts.findFirst({
    where: (products, { and, eq }) => and(
      eq(products.userId, userId),
      eq(products.sku, checked.data.sku)
    ),
  });

  if (existingProduct) {
    return { ok: false, field: 'sku', message: `Product with SKU '${checked.data.sku}' already exists` };
  }

  return checked;
}

async function importProducts(userId: string, data: Record<string, string>[], overwrite: boolean): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: 0, errorDetails: [] };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    try {
      const checked = await validateProductRow(userId, row, overwrite);
      if (!checked.ok) {
        result.errors++;
        result.errorDetails.push(`Row ${i + 1}: ${checked.message}`);
        continue;
      }
      const productData = checked.data;

      // Insert or update product
      await db.insert(userProducts).values({
        userId,
        name: productData.name,
        sku: productData.sku,
        price: productData.price.toString(),
        category: productData.category,
        description: productData.description,
      }).onConflictDoUpdate({
        target: [userProducts.userId, userProducts.sku],
        set: {
          name: productData.name,
          price: productData.price.toString(),
          category: productData.category,
          description: productData.description,
          updatedAt: new Date(),
        },
      });

      result.imported++;
    } catch (error) {
      result.errors++;
      result.errorDetails.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}

function checkCompetitorRow(row: Record<string, string>): RowCheck<CompetitorImportData> {
  const competitorData: CompetitorImportData = {
    domain: row.domain ?? row.website ?? row.url ?? '',
    name: row.name ?? row.business_name ?? row.company ?? '',
    industry: row.industry ?? row.sector ?? '',
    notes: row.notes ?? row.comments ?? '',
  };

  // Validate required fields
  if (!competitorData.domain) {
    return { ok: false, field: 'domain', message: 'Missing required field (domain)' };
  }

  // Clean domain (remove protocol, www, trailing slash)
  competitorData.domain = competitorData.domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');

  return { ok: true, data: competitorData };
}

async function validateCompetitorRow(
  userId: string,
  row: Record<string, string>,
  overwrite: boolean,
): Promise<RowCheck<CompetitorRowData>> {
  const checked = checkCompetitorRow(row);
  if (!checked.ok) return checked;
  const competitor = checked.data;

  const existingCompetitor = await db.query.competitors.findFirst({
    where: (competitors, { eq }) => eq(competitors.domain, competitor.domain),
  });

  if (existingCompetitor && !overwrite) {
    // Check if user already has this competitor
    const userCompetitor = await db.query.userCompetitors.findFirst({
      where: (userCompetitors, { and, eq }) => and(
        eq(userCompetitors.userId, userId),
        eq(userCompetitors.competitorId, existingCompetitor.id)
      ),
    });

    if (userCompetitor) {
      return { ok: false, field: 'domain', message: `Competitor '${competitor.domain}' already exists` };
    }
  }

  return { ok: true, data: { competitor, existingCompetitorId: existingCompetitor?.id ?? null } };
}

async function importCompetitors(userId: string, data: Record<string, string>[], overwrite: boolean): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: 0, errorDetails: [] };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    try {
      const checked = await validateCompetitorRow(userId, row, overwrite);
      if (!checked.ok) {
        result.errors++;
        result.errorDetails.push(`Row ${i + 1}: ${checked.message}`);
        continue;
      }
      const { competitor: competitorData, existingCompetitorId } = checked.data;

      let competitorId: string;

      if (existingCompetitorId) {
        competitorId = existingCompetitorId;
      } else {
        // Create new competitor
        const [newCompetitor] = await db.insert(competitors).values({
          domain: competitorData.domain,
          metadata: {
            matchScore: 0,
            matchReasons: [],
            suggestedApproach: '',
            dataGaps: [],
            lastAnalyzed: new Date().toISOString(),
            businessName: competitorData.name,
            platforms: [],
            products: [],
          },
        }).returning();
        
        competitorId = newCompetitor!.id;
      }

      // Link competitor to user
      await db.insert(userCompetitors).values({
        userId,
        competitorId,
        relationshipStrength: 1,
      }).onConflictDoNothing();

      result.imported++;
    } catch (error) {
      result.errors++;
      result.errorDetails.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}

async function importSales(userId: string, data: Record<string, string>[], overwrite: boolean): Promise<ImportResult> {
  // TODO: Implement sales import when sales schema is available
  return { imported: 0, errors: data.length, errorDetails: ['Sales import not yet implemented'] };
}

async function importInventory(userId: string, data: Record<string, string>[], overwrite: boolean): Promise<ImportResult> {
  // TODO: Implement inventory import when inventory schema is available
  return { imported: 0, errors: data.length, errorDetails: ['Inventory import not yet implemented'] };
}

function unsupportedRow(message: string): RowCheck<never> {
  return { ok: false, field: 'type', message };
}

async function previewRows<T>(
  data: Record<string, string>[],
  validate: (row: Record<string, string>) => Promise<RowCheck<T>>,
  toSample: (value: T) => unknown = (value) => value,
): Promise<ImportPreview> {
  const preview: ImportPreview = { totalRows: data.length, validRows: 0, errors: [], sampleData: [] };

  for (let i = 0; i < data.length; i++) {
    const checked = await validate(data[i] ?? {});
    if (checked.ok) {
      preview.validRows++;
      if (preview.sampleData.length < PREVIEW_SAMPLE_LIMIT) {
        preview.sampleData.push(toSample(checked.data));
      }
    } else if (preview.errors.length < PREVIEW_ERROR_LIMIT) {
      preview.errors.push({ row: i + 1, field: checked.field, message: checked.message });
    }
  }

  return preview;
}

async function previewImport(
  type: ImportType,
  userId: string,
  data: Record<string, string>[],
  overwrite: boolean,
): Promise<ImportPreview> {
  switch (type) {
    case 'products':
      return previewRows(data, (row) => validateProductRow(userId, row, overwrite));
    case 'competitors':
      return previewRows(
        data,
        (row) => validateCompetitorRow(userId, row, overwrite),
        (value) => value.competitor,
      );
    case 'sales':
      return previewRows(data, async () => unsupportedRow('Sales import not yet implemented'));
    case 'inventory':
      return previewRows(data, async () => unsupportedRow('Inventory import not yet implemented'));
  }
}
