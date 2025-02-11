export function extractJSON(content: string, type: "object" | "array"): string {
  const firstChar = type === "object" ? "{" : "[";
  const lastChar = type === "object" ? "}" : "]";
  const start = content.indexOf(firstChar);
  const end = content.lastIndexOf(lastChar);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No valid JSON found");
  }
  return content.substring(start, end + 1);
} 