import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonUtils {
  static extractJSON(
    text: string,
    expectedType: 'object' | 'array' = 'object',
  ): string {
    // First try to find JSON within code blocks
    const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
    if (codeBlockMatch?.[1]) {
      const extracted = codeBlockMatch[1].trim();
      try {
        // Validate it's the expected type
        const parsed = JSON.parse(extracted) as unknown;
        if (
          (expectedType === 'object' &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)) ||
          (expectedType === 'array' && Array.isArray(parsed))
        ) {
          return extracted;
        }
      } catch {
        // Continue to other methods if parsing fails
      }
    }

    // Try to find JSON-like content
    const jsonPattern =
      expectedType === 'object' ? /\{[\s\S]*\}/ : /\[[\s\S]*\]/;

    const match = text.match(jsonPattern);
    if (match?.[0]) {
      const extracted = match[0].trim();
      try {
        // Validate it's the expected type
        const parsed = JSON.parse(extracted) as unknown;
        if (
          (expectedType === 'object' &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)) ||
          (expectedType === 'array' && Array.isArray(parsed))
        ) {
          return extracted;
        }
      } catch {
        // Continue to cleanup if parsing fails
      }
    }

    // Clean up common issues
    let cleaned = text
      .replace(/^[^{[]*/, '') // Remove any text before the first { or [
      .replace(/[^}\]]*$/, '') // Remove any text after the last } or ]
      .replace(/\\n/g, ' ') // Replace newlines with spaces
      .replace(/\\"/g, '"') // Fix escaped quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Add missing quotes around property names
    cleaned = cleaned.replace(
      /(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
      '$1"$2":',
    );

    try {
      // Final validation
      const parsed = JSON.parse(cleaned) as unknown;
      if (
        (expectedType === 'object' &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed)) ||
        (expectedType === 'array' && Array.isArray(parsed))
      ) {
        return cleaned;
      }
    } catch {
      // If all attempts fail, return a default structure
      return expectedType === 'object' ? '{}' : '[]';
    }

    // If type doesn't match, return default
    return expectedType === 'object' ? '{}' : '[]';
  }

  /**
   * Safely converts LLM response content to string, handling potential edge cases
   */
  static safeStringify(content: unknown): string {
    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'string') {
      return content;
    }

    if (typeof content === 'object') {
      try {
        // First attempt proper JSON serialization
        const jsonString = JSON.stringify(content);
        // Don't return unhelpful "[object Object]" strings
        return jsonString === '[object Object]' ? '' : jsonString;
      } catch {
        // If serialization fails, return empty string
        return '';
      }
    }

    // For primitive types (numbers, booleans)
    if (typeof content === 'number' || typeof content === 'boolean') {
      return String(content);
    }

    // For any other type that might use Object's default stringification
    return '';
  }
}
