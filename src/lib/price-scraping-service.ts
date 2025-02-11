import { env } from "~/env";

interface PriceData {
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
}

export class PriceScrapingService {
  async getPriceData(productUrl: string): Promise<PriceData[]> {
    const domain = new URL(productUrl).hostname;
    
    const params = new URLSearchParams({
        api_key: env.VALUESERP_API_KEY!,
        q: `site:${domain}`,
        location: "United States",
        google_domain: "google.com",
        search_type: "shopping",
        output: "json",
        page: "1"
    });

    const response = await fetch(`https://api.valueserp.com/search?${params}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
      throw new Error(`ValueSERP API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.extractPriceData(data.shopping_results || []);
  }

  private extractPriceData(results: any[]): PriceData[] {
    return results.map(result => ({
      price: this.extractNumericPrice(result.price),
      currency: result.price.match(/[A-Z]{3}/)?.[0] || 'USD',
      timestamp: new Date(),
      source: result.source
    }));
  }

  private extractNumericPrice(priceStr: string): number {
    return parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  }
} 