import { NextRequest, NextResponse } from 'next/server';
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

interface ImportResult {
  imported: number;
  errors: number;
  errorDetails: string[];
}

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

async function importProducts(userId: string, data: Record<string, string>[], overwrite: boolean): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: 0, errorDetails: [] };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    try {
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
        result.errors++;
        result.errorDetails.push(`Row ${i + 1}: Missing required fields (name, sku, price)`);
        continue;
      }

      // Check if product exists
      if (!overwrite) {
        const existingProduct = await db.query.userProducts.findFirst({
          where: (products, { and, eq }) => and(
            eq(products.userId, userId),
            eq(products.sku, productData.sku)
          ),
        });

        if (existingProduct) {
          result.errors++;
          result.errorDetails.push(`Row ${i + 1}: Product with SKU '${productData.sku}' already exists`);
          continue;
        }
      }

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

async function importCompetitors(userId: string, data: Record<string, string>[], overwrite: boolean): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, errors: 0, errorDetails: [] };
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    try {
      const competitorData: CompetitorImportData = {
        domain: row.domain ?? row.website ?? row.url ?? '',
        name: row.name ?? row.business_name ?? row.company ?? '',
        industry: row.industry ?? row.sector ?? '',
        notes: row.notes ?? row.comments ?? '',
      };

      // Validate required fields
      if (!competitorData.domain) {
        result.errors++;
        result.errorDetails.push(`Row ${i + 1}: Missing required field (domain)`);
        continue;
      }

      // Clean domain (remove protocol, www, trailing slash)
      competitorData.domain = competitorData.domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');

      // Check if competitor exists
      const existingCompetitor = await db.query.competitors.findFirst({
        where: (competitors, { eq }) => eq(competitors.domain, competitorData.domain),
      });

      let competitorId: string;

      if (existingCompetitor) {
        if (!overwrite) {
          // Check if user already has this competitor
          const userCompetitor = await db.query.userCompetitors.findFirst({
            where: (userCompetitors, { and, eq }) => and(
              eq(userCompetitors.userId, userId),
              eq(userCompetitors.competitorId, existingCompetitor.id)
            ),
          });

          if (userCompetitor) {
            result.errors++;
            result.errorDetails.push(`Row ${i + 1}: Competitor '${competitorData.domain}' already exists`);
            continue;
          }
        }
        competitorId = existingCompetitor.id;
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