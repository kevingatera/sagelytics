import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { db } from '~/server/db';
import { z } from 'zod';

const exportRequestSchema = z.object({
  type: z.enum(['products', 'competitors', 'sales', 'inventory']),
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (!type) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 });
    }

    // Quick export - return data immediately in CSV format
    const data = await getExportData(session.user.id, type);
    const csv = convertToCSV(data);
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${type}-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ 
      error: 'Export failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = exportRequestSchema.parse(body);

    // Get data based on type
    const data = await getExportData(session.user.id, validatedData.type, validatedData.fields);
    
    let content: string;
    let contentType: string;
    let extension: string;

    switch (validatedData.format) {
      case 'csv':
        content = convertToCSV(data);
        contentType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        content = JSON.stringify(data, null, 2);
        contentType = 'application/json';
        extension = 'json';
        break;
      case 'xlsx':
        // For now, fall back to CSV
        content = convertToCSV(data);
        contentType = 'text/csv';
        extension = 'csv';
        break;
      default:
        throw new Error('Unsupported export format');
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${validatedData.type}-export-${new Date().toISOString().split('T')[0]}.${extension}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ 
      error: 'Export failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function getExportData(userId: string, type: string, fields?: string[]): Promise<Record<string, unknown>[]> {
  switch (type) {
    case 'products':
      return await exportProducts(userId, fields);
    case 'competitors':
      return await exportCompetitors(userId, fields);
    case 'sales':
      return await exportSales(userId, fields);
    case 'inventory':
      return await exportInventory(userId, fields);
    default:
      throw new Error('Unsupported data type');
  }
}

async function exportProducts(userId: string, fields?: string[]): Promise<Record<string, unknown>[]> {
  const products = await db.query.userProducts.findMany({
    where: (userProducts, { eq }) => eq(userProducts.userId, userId),
  });

  return products.map(product => {
    const data: Record<string, unknown> = {
      name: product.name,
      sku: product.sku,
      price: product.price,
      category: product.category,
      description: product.description,
      isActive: product.isActive,
      createdAt: product.createdAt?.toISOString(),
      updatedAt: product.updatedAt?.toISOString(),
    };

    if (fields && fields.length > 0) {
      const filteredData: Record<string, unknown> = {};
      fields.forEach(field => {
        if (field in data) {
          filteredData[field] = data[field];
        }
      });
      return filteredData;
    }

    return data;
  });
}

async function exportCompetitors(userId: string, fields?: string[]): Promise<Record<string, unknown>[]> {
  const userCompetitors = await db.query.userCompetitors.findMany({
    where: (userCompetitors, { eq }) => eq(userCompetitors.userId, userId),
    with: {
      competitor: true,
    },
  });

  return userCompetitors.map(({ competitor }) => {
    const data: Record<string, unknown> = {
      domain: competitor.domain,
      businessName: competitor.metadata.businessName,
      matchScore: competitor.metadata.matchScore,
      matchReasons: competitor.metadata.matchReasons.join('; '),
      dataGaps: competitor.metadata.dataGaps.join('; '),
      productCount: competitor.metadata.products.length,
      lastAnalyzed: competitor.metadata.lastAnalyzed,
    };

    if (fields && fields.length > 0) {
      const filteredData: Record<string, unknown> = {};
      fields.forEach(field => {
        if (field in data) {
          filteredData[field] = data[field];
        }
      });
      return filteredData;
    }

    return data;
  });
}

async function exportSales(userId: string, fields?: string[]): Promise<Record<string, unknown>[]> {
  // TODO: Implement when sales schema is available
  return [];
}

async function exportInventory(userId: string, fields?: string[]): Promise<Record<string, unknown>[]> {
  // TODO: Implement when inventory schema is available
  return [];
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) {
    return '';
  }

  const headers = Object.keys(data[0]!);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value == null) return '';
      
      // Convert to string based on type
      let stringValue: string;
      if (typeof value === 'string') {
        stringValue = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        stringValue = value.toString();
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = '';
      }
      
      // Handle values that might contain commas or quotes
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
} 