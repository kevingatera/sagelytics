export async function parseCSV(fileContent: Uint8Array): Promise<Record<string, string>[]> {
  const text = new TextDecoder().decode(fileContent);
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('File is empty');
  }
  
  const headers = lines[0]!.split(',').map(h => h.trim().replace(/"/g, ''));
  const data: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    
    data.push(row);
  }
  
  return data;
}

export async function parseXLSX(fileContent: Uint8Array): Promise<Record<string, string>[]> {
  // For now, throw an error - XLSX parsing requires additional dependency
  throw new Error('Excel file parsing not yet supported. Please use CSV format.');
}

export async function parseJSON(fileContent: Uint8Array): Promise<Record<string, string>[]> {
  const text = new TextDecoder().decode(fileContent);
  
  try {
    const data = JSON.parse(text) as unknown;
    
    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of objects');
    }
    
    return data as Record<string, string>[];
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
} 