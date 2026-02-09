export function formatCompetitorName(domain: string, businessName?: string): string {
  // If no business name just return cleaned domain
  if (!businessName || businessName.trim().length === 0) {
    return domain;
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '');
  const rootDomain = cleanDomain.split('.')[0] ?? cleanDomain;

  // Normalise for comparison (remove non-alphanumeric, to lowercase)
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const rootNorm = normalize(rootDomain);
  const businessNorm = normalize(businessName);

  // Show just business name if similar enough
  if (businessNorm.includes(rootNorm) || rootNorm.includes(businessNorm)) {
    return businessName;
  }

  // Otherwise append domain in parentheses
  return `${businessName} (${cleanDomain})`;
} 