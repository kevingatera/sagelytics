export function extractJSON(content: string, type: "object" | "array"): string {
  const openChar = type === "object" ? "{" : "[";
  const closeChar = type === "object" ? "}" : "]";
  const first = content.indexOf(openChar);
  if (first === -1) throw new Error("No valid JSON found");
  let counter = 0;
  let end = -1;
  for (let i = first; i < content.length; i++) {
    if (content[i] === openChar) counter++;
    else if (content[i] === closeChar) counter--;
    if (counter === 0) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error("No valid JSON found");
  return content.substring(first, end + 1);
} 