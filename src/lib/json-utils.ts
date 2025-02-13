export function extractJSON(text: string, expectedType: 'object' | 'array' = 'object'): string {
  // First try to find JSON within code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    const extracted = codeBlockMatch[1].trim();
    try {
      // Validate it's the expected type
      const parsed = JSON.parse(extracted);
      if ((expectedType === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) ||
          (expectedType === 'array' && Array.isArray(parsed))) {
        return extracted;
      }
    } catch (e) {
      // Continue to other methods if parsing fails
    }
  }

  // Try to find JSON-like content
  const jsonPattern = expectedType === 'object' 
    ? /\{[\s\S]*\}/
    : /\[[\s\S]*\]/;
  
  const match = text.match(jsonPattern);
  if (match?.[0]) {
    const extracted = match[0].trim();
    try {
      // Validate it's the expected type
      const parsed = JSON.parse(extracted);
      if ((expectedType === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) ||
          (expectedType === 'array' && Array.isArray(parsed))) {
        return extracted;
      }
    } catch (e) {
      // Continue to cleanup if parsing fails
    }
  }

  // Clean up common issues
  let cleaned = text
    .replace(/^[^{\[]*/, '') // Remove any text before the first { or [
    .replace(/[^}\]]*$/, '') // Remove any text after the last } or ]
    .replace(/\\n/g, ' ')    // Replace newlines with spaces
    .replace(/\\"/g, '"')    // Fix escaped quotes
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();

  // Add missing quotes around property names
  cleaned = cleaned.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\:/g, '$1"$2":');

  try {
    // Final validation
    const parsed = JSON.parse(cleaned);
    if ((expectedType === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) ||
        (expectedType === 'array' && Array.isArray(parsed))) {
      return cleaned;
    }
  } catch (e) {
    // If all attempts fail, return a default structure
    return expectedType === 'object' ? '{}' : '[]';
  }

  // If type doesn't match, return default
  return expectedType === 'object' ? '{}' : '[]';
} 