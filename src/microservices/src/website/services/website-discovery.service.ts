import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '../../shared/services/model-manager.service';
import * as cheerio from 'cheerio';
import { ChatGroq } from '@langchain/groq';
import type { Env } from '../../env';
import { JsonUtils } from '../../shared/utils';

export interface WebsiteContent {
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    url: string | null;
    price: number | null;
    currency: string;
    description: string | null;
    category: string | null;
  }>;
  services: Array<{
    name: string;
    url: string | null;
    price: number | null;
    currency: string;
    description: string | null;
    category: string | null;
  }>;
  metadata: {
    businessType?: string;
    contactInfo?: {
      email?: string;
      phone?: string;
      address?: string;
    };
    socialMedia?: Record<string, string>;
    structuredData?: any[];
    prices?: PriceData[];
    extractedData?: any;
  };
}

interface PriceData {
  price: number;
  currency: string;
  timestamp: Date;
  source: string;
}

@Injectable()
export class WebsiteDiscoveryService {
  private spider: Spider;
  private readonly MAX_TEXT_LENGTH = 8000;
  private readonly TIMEOUT = 60000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000;
  private readonly USER_AGENTS = {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  };

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly configService: ConfigService<Env, true>
  ) {
    this.spider = new Spider({ 
      apiKey: this.configService.get('SPIDER_API_KEY')
    });
  }

  private async directFetch(url: string, userAgent: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) return null;
      return await response.text();
    } catch (error) {
      console.warn('Direct fetch failed:', error);
      return null;
    }
  }

  private extractStructuredData($: cheerio.Root): any[] {
    const structuredData: any[] = [];
    
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (!content) return;
        
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          structuredData.push(...data);
        } else {
          structuredData.push(data);
        }
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error);
      }
    });

    return structuredData;
  }

  private extractMetaTags($: cheerio.Root): { title: string; description: string } {
    const title = this.sanitizeText(
      $('title').text() || 
      $('meta[property="og:title"]').attr('content') || 
      $('meta[name="twitter:title"]').attr('content') || 
      ''
    );

    const description = this.sanitizeText(
      $('meta[name="description"]').attr('content') || 
      $('meta[property="og:description"]').attr('content') || 
      $('meta[name="twitter:description"]').attr('content') || 
      ''
    );

    return { title, description };
  }

  private extractPricing($: cheerio.Root): PriceData[] {
    const priceSelectors = [
      '[itemprop="price"]',
      '.price',
      '[data-price]',
      '*:contains("$")',
      '*:contains("€")',
      '*:contains("£")',
      '*:contains("USD")',
      '*:contains("EUR")',
      '*:contains("GBP")'
    ];

    const prices: PriceData[] = [];
    const now = new Date();
    const priceRegex = /[\d,.]+/;
    const currencyRegex = /[$€£]|USD|EUR|GBP/;
    
    priceSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        
        // Skip if element is hidden or part of navigation/footer
        if (
          $el.closest('nav, footer, header').length > 0 ||
          $el.css('display') === 'none' ||
          $el.css('visibility') === 'hidden'
        ) {
          return;
        }

        const priceMatch = text.match(priceRegex);
        if (priceMatch) {
          const price = parseFloat(priceMatch[0].replace(/,/g, ''));
          const currencyMatch = text.match(currencyRegex);
          const currency = currencyMatch ? 
            currencyMatch[0].replace('USD', '$').replace('EUR', '€').replace('GBP', '£') : 
            '$';

          if (!isNaN(price) && price > 0) {
            prices.push({
              price,
              currency,
              timestamp: now,
              source: selector
            });
          }
        }
      });
    });

    return prices;
  }

  private extractContactInfo($: cheerio.Root): { address?: string } {
    const contactInfo: { address?: string } = {};

    const addressData = this.extractStructuredData($).find(data =>
      data['@type'] === 'PostalAddress' ||
      data['@type'] === 'LocalBusiness' ||
      data.address
    );

    if (addressData) {
      if (addressData.address?.streetAddress) {
        contactInfo.address = addressData.address.streetAddress;
      } else if (addressData.streetAddress) {
        contactInfo.address = addressData.streetAddress;
      } else if (addressData.address) {
        contactInfo.address =
          typeof addressData.address === 'string'
            ? addressData.address
            : Object.values(addressData.address).filter(v => typeof v === 'string').join(', ');
      }
    }

    // Fallback address extraction from content
    if (!contactInfo.address) {
      $('*:contains("Address:")').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 10 && text.includes(',') && !contactInfo.address) {
          contactInfo.address = text.replace('Address:', '').trim();
        }
      });
    }

    return contactInfo;
  }

  private async analyzeContentWithLLM(cleanedContent: string, structuredData: any[]): Promise<{
    products: WebsiteContent['products'];
    services: WebsiteContent['services'];
  }> {
    const prompt = `Analyze this website content and extract products and services.
    
    Structured Data Available:
    ${JSON.stringify(structuredData, null, 2)}

    Guidelines:
    1. Look for clear product/service offerings with names and prices
    2. Categorize items appropriately
    3. Extract URLs when available
    4. Normalize currency to standard symbols ($, €, £)
    5. Include descriptions that explain the value proposition
    6. Group similar items under common categories
    
    Return ONLY a JSON object with this structure:
    {
      "products": [
        {
          "name": "Product Name",
          "url": "URL or null",
          "price": number or null,
          "currency": "USD/EUR/etc",
          "description": "Brief description or null",
          "category": "Product category or null"
        }
      ],
      "services": [
        {
          "name": "Service Name",
          "url": "URL or null",
          "price": number or null,
          "currency": "USD/EUR/etc",
          "description": "Brief description or null",
          "category": "Service category or null"
        }
      ]
    }

    Website Content:
    ${cleanedContent}`;

    const result = await this.modelManager.withBatchProcessing(async (llm: ChatGroq) => {
      return await llm.invoke(prompt);
    }, prompt);

    const content = result.content.toString();
    const jsonStr = JsonUtils.extractJSON(content, 'object');
    const parsed = JSON.parse(jsonStr);

    return {
      products: this.validateAndNormalizeOfferings(parsed.products || []),
      services: this.validateAndNormalizeOfferings(parsed.services || [])
    };
  }

  private validateAndNormalizeOfferings<T>(offerings: T[]): T[] {
    return offerings
      .filter(offering => {
        try {
          const required = ['name'];
          const obj = offering as any;
          return required.every(field => obj[field]);
        } catch {
          return false;
        }
      })
      .map(offering => {
        const normalized = {
          ...offering,
          price: (offering as any).price || null,
          currency: (offering as any).currency || 'USD',
          url: (offering as any).url || null,
          description: (offering as any).description || null,
          category: (offering as any).category || null
        };

        // Normalize currency symbols
        normalized.currency = normalized.currency
          .replace('USD', '$')
          .replace('EUR', '€')
          .replace('GBP', '£');

        return normalized as T;
      });
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private prepareTextForAnalysis(texts: string[], maxLength: number): string {
    const cleanedTexts = texts
      .map(text => this.sanitizeText(text))
      .filter(text => text.length > 0);

    let result = '';
    for (const text of cleanedTexts) {
      if (result.length + text.length <= maxLength) {
        result += text + ' ';
      } else {
        const remainingLength = maxLength - result.length;
        if (remainingLength > 0) {
          result += text.slice(0, remainingLength);
        }
        break;
      }
    }

    return result.trim();
  }

  private extractCleanText(html: string): string {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, noscript, iframe').remove();
    
    // Extract text from remaining elements
    const text = $('body').text();
    
    return this.sanitizeText(text);
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    console.info(`Starting website content discovery for ${domain}`);
    let retries = 0;
    let lastError: Error | null = null;

    // Ensure domain has protocol
    if (!domain.startsWith('http')) {
      domain = `https://${domain}`;
    }
    const url = new URL(domain);
    domain = url.toString();

    while (retries < this.MAX_RETRIES) {
      try {
        // First attempt: Direct fetch with desktop user agent
        let html = await this.directFetch(domain, this.USER_AGENTS.desktop);
        
        // Second attempt: Direct fetch with mobile user agent
        if (!html) {
          html = await this.directFetch(domain, this.USER_AGENTS.mobile);
        }

        // Final attempt: Use spider if direct fetches fail
        if (!html) {
          console.log('Direct fetches failed, using spider');
          const spiderResult = await this.spider.crawlUrl(domain, {
            limit: 1,
            store_data: true,
            metadata: true,
            request: "smart", // Let spider decide between http/chrome
            headers: { 'User-Agent': this.USER_AGENTS.desktop }
          });
          
          if (Array.isArray(spiderResult) && spiderResult.length > 0) {
            const firstResult = spiderResult[0];
            html = firstResult?.content || null;
          }
        }

        if (!html) {
          throw new Error('Failed to fetch website content');
        }

        const $ = cheerio.load(html);
        
        // Clean and prepare text
        const cleanedText = this.prepareTextForAnalysis(
          [this.extractCleanText(html)],
          this.MAX_TEXT_LENGTH
        );
        
        // Initialize content structure
        const content: WebsiteContent = {
          url: domain,
          title: "",
          description: "",
          products: [],
          services: [],
          metadata: {}
        };

        // Extract metadata
        const metaTags = this.extractMetaTags($);
        content.title = metaTags.title;
        content.description = metaTags.description;

        // Extract structured data
        const structuredData = this.extractStructuredData($);
        content.metadata.structuredData = structuredData;

        // Extract contact info
        content.metadata.contactInfo = this.extractContactInfo($);

        // Extract pricing
        content.metadata.prices = this.extractPricing($);

        // Analyze content with LLM
        const offerings = await this.analyzeContentWithLLM(cleanedText, structuredData);
        content.products = offerings.products;
        content.services = offerings.services;

        console.info(`Website content discovery completed for ${domain}`);
        return content;

      } catch (error) {
        lastError = error as Error;
        retries++;
        if (retries < this.MAX_RETRIES) {
          console.warn(`Attempt ${retries} failed, retrying in ${this.RETRY_DELAY/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
          continue;
        }
        if (error instanceof Error && error.message.includes("Rate limit reached")) {
          console.log('Rate limit encountered, using batch processing');
          continue;
        }
        console.error(`Failed to discover website content after ${retries} attempts:`, error);
        throw new Error(`Website content discovery failed after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw lastError || new Error('Failed to discover website content');
  }
} 