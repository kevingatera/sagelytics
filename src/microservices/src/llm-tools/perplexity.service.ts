import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

const PerplexityResponseSchema = z.object({
  id: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string(),
      }),
      index: z.number(),
      finish_reason: z.string().optional(),
    }),
  ),
  created: z.number(),
  model: z.string(),
  links: z.array(z.string()).optional(),
});

// Simplified representation of competitor items returned by LLM
interface LlmCompetitor {
  domain?: string;
  name?: string;
  description?: string;
}

type PerplexityMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly baseUrl = 'https://api.perplexity.ai';
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly requestTimeoutMs: number;
  private readonly searchContextSize: 'low' | 'medium' | 'high';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('PERPLEXITY_API_KEY');
    this.model = this.configService.get<string>('PERPLEXITY_MODEL', 'sonar');

    const configuredMaxTokens = Number(
      this.configService.get<string>('PERPLEXITY_MAX_TOKENS', '1200'),
    );
    this.maxTokens =
      Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
        ? Math.min(Math.floor(configuredMaxTokens), 2048)
        : 1200;

    const configuredTimeoutMs = Number(
      this.configService.get<string>('PERPLEXITY_TIMEOUT_MS', '45000'),
    );
    this.requestTimeoutMs =
      Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
        ? Math.min(Math.floor(configuredTimeoutMs), 120000)
        : 45000;

    const rawContextSize =
      this.configService.get<string>('PERPLEXITY_SEARCH_CONTEXT_SIZE') ??
      'medium';
    this.searchContextSize =
      rawContextSize === 'low' ||
      rawContextSize === 'medium' ||
      rawContextSize === 'high'
        ? rawContextSize
        : 'medium';

    this.logger.log('Perplexity service initialized');
  }

  private async perplexityFetch(
    body: Record<string, unknown>,
  ): Promise<Response> {
    const modelsToTry =
      this.model === 'sonar-pro' ? ['sonar-pro'] : [this.model, 'sonar-pro'];
    let lastStatus: number | null = null;
    let lastErrorBody = '';

    for (const model of modelsToTry) {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          ...body,
          model,
          max_tokens: this.maxTokens,
          web_search_options: {
            search_context_size: this.searchContextSize,
          },
        }),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });

      if (response.ok) {
        return response;
      }

      lastStatus = response.status;
      lastErrorBody = await response.text();
      this.logger.warn(
        `Perplexity request failed on model ${model}: ${response.status}`,
      );
    }

    throw new Error(
      `API request failed: status ${lastStatus ?? 'unknown'}, body: ${lastErrorBody}`,
    );
  }

  /**
   * Query Perplexity API for competitive analysis data
   * @param query The specific query related to competitors, products, or pricing
   * @param businessType The type of business being analyzed
   * @param domain The domain of the target business
   * @returns Structured information extracted from Perplexity's response
   */
  async queryCompetitorData(
    query: string,
    businessType: string,
    domain: string,
  ): Promise<{
    content: string;
    competitors?: string[];
    products?: Array<{
      name: string;
      price?: number;
      currency?: string;
      description?: string;
    }>;
    sources?: string[];
  }> {
    try {
      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a business analyst assistant that researches competitive intelligence for ${businessType} businesses. 
          Return detailed, factual, and up-to-date information about competitors, their products, and pricing.
          Focus on finding accurate pricing information, product details, and competitive positioning.
          When possible, extract concrete numerical data like prices, ratings, and feature comparisons.
          Always include source URLs for verification.`,
        },
        {
          role: 'user',
          content: `${query} for the business: ${domain}`,
        },
      ];

      this.logger.debug(`Querying Perplexity for: ${query} about ${domain}`);

      const response = await this.perplexityFetch({
        messages,
        temperature: 0.1,
      });

      const data = await response.json();
      const validatedResponse = PerplexityResponseSchema.parse(data);
      const content = validatedResponse.choices[0]?.message.content || '';
      const sources = validatedResponse.links || [];

      this.logger.debug(
        `Received response from Perplexity with ${sources.length} sources`,
      );

      const competitorMatches = content.match(
        /competitor(?:s)?:?\s*([^.]*\.)/gi,
      );
      const competitors = competitorMatches
        ? this.extractCompetitors(competitorMatches.join(' '))
        : [];

      const productMatches = content.match(/products?(?:s)?:?\s*([^.]*\.)/gi);
      const products = productMatches
        ? this.extractProducts(productMatches.join(' '))
        : [];

      return {
        content,
        competitors,
        products,
        sources,
      };
    } catch (error) {
      this.logger.error(
        `Failed to query Perplexity: ${error.message}`,
        error.stack,
      );
      throw new Error(`Perplexity API query failed: ${error.message}`);
    }
  }

  /**
   * Search for specific competitor information with structured output
   * @param domain Competitor domain to research
   * @param businessType Type of business
   * @param productQuery Specific product or pricing query
   */
  async researchCompetitor(
    domain: string,
    businessType: string,
    productQuery?: string,
  ): Promise<{
    businessName?: string;
    insights: string;
    products: Array<{
      name: string;
      url?: string;
      price?: number;
      currency?: string;
      description?: string;
      features?: string[];
    }>;
    sources: string[];
  }> {
    try {
      const jsonSchema = {
        schema: {
          type: 'object',
          properties: {
            businessName: {
              type: 'string',
              description:
                'The official business/company name (not just the domain)',
            },
            insights: {
              type: 'string',
              description: "Summary of the company's competitive positioning",
            },
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  url: {
                    type: 'string',
                    description:
                      'Direct URL to the specific product page for monitoring',
                  },
                  price: { type: 'number', description: 'Numerical price' },
                  currency: { type: 'string', description: 'e.g., USD, EUR' },
                  description: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                },
                required: ['name'],
              },
              description:
                'Array of products/services offered with specific URLs',
            },
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'URLs used for research',
            },
          },
          required: ['businessName', 'insights', 'products', 'sources'],
        },
      };

      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a business analyst specialized in competitive intelligence.
          Research the ${businessType} business at ${domain}.
          
          CRITICAL REQUIREMENTS:
          1. Extract the official business/company name (not just the domain name)
          2. For each product/service, extract the most specific product page URL possible:
             - Prefer direct links to the product page (from anchor tags, buttons, or structured data)
             - If no direct product URL is found, fallback to the closest relevant subpage (e.g., /rooms, /products, /shop) instead of the homepage
             - If no link is found, return null
          3. For each product, also return a 'urlSource' field indicating how the URL was found (e.g., 'structured_data', 'anchor', 'llm', 'fallback', 'none')
          4. Extract granular product information with individual prices
          
          Your primary goal is to extract *granular and specific* information about their individual products, services, and their respective prices WITH direct URLs to each product page.
          If a business offers product packages, bundles, or categories (e.g., 'Luxury Rooms (Single, Double, Suite)'), do your best to break these down into individual purchasable items with their own names, prices, and specific URLs.
          For example, instead of 'Luxury Rooms - $100-$300', try to find:
          - 'Luxury Single Room - $100' with URL: https://domain.com/rooms/luxury-single
          - 'Luxury Double Room - $200' with URL: https://domain.com/rooms/luxury-double  
          - 'Luxury Suite - $300' with URL: https://domain.com/rooms/luxury-suite
          
          For each product, try to find the direct URL to that specific product page where pricing is displayed.
          If a service like 'Restaurant and Bar (Full Board)' is listed with a price of 0 or as included, try to find out what an equivalent standalone price might be, or note if it's genuinely included at no extra cost with another purchase.
          Return all information according to the provided JSON schema precisely. Prioritize accuracy and detail for each product/service with their monitoring URLs and urlSource.`,
        },
        {
          role: 'user',
          content: productQuery
            ? `Research ${domain} with focus on their ${productQuery}. Extract the business name, all pricing and competitive details, and specific product URLs according to the JSON schema. Be sure to break down any product categories into individual items with specific prices and their direct URLs for monitoring.`
            : `Research ${domain} and provide a complete analysis including:
            1. The official business/company name
            2. Their products, services, and pricing with specific URLs to each product page
            3. Competitive positioning in the ${businessType} industry
            
            Focus on identifying distinct products/services with specific prices and direct URLs that can be monitored for price changes. If you find product categories, try to list individual items within those categories with their prices and specific URLs separately. Format your response strictly according to the JSON schema.`,
        },
      ];

      this.logger.debug(`Researching competitor: ${domain} (${businessType})`);

      const response = await this.perplexityFetch({
        messages,
        temperature: 0.1,
        response_format: { type: 'json_schema', json_schema: jsonSchema },
      });

      const data = await response.json();
      const validatedResponse = PerplexityResponseSchema.parse(data);
      const content = validatedResponse.choices[0]?.message.content || '{}';

      try {
        const parsedContent = JSON.parse(content);
        return {
          businessName: parsedContent.businessName || undefined,
          insights: parsedContent.insights || '',
          products: Array.isArray(parsedContent.products)
            ? parsedContent.products
            : [],
          sources: Array.isArray(parsedContent.sources)
            ? parsedContent.sources
            : [],
        };
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse JSON response: ${parseError.message}`,
        );
        return {
          businessName: undefined,
          insights: content,
          products: [],
          sources: validatedResponse.links || [],
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to research competitor: ${error.message}`,
        error.stack,
      );
      throw new Error(`Competitor research failed: ${error.message}`);
    }
  }

  /**
   * Discover competitors for a business using Perplexity's search capabilities
   * @param domain Business domain to find competitors for
   * @param businessType Type of business
   * @param region Optional region/location for more targeted results
   */
  async discoverCompetitors(
    domain: string,
    businessType: string,
    region?: string,
  ): Promise<{
    competitors: Array<{
      name: string;
      domain: string;
      description?: string;
    }>;
    sources: string[];
  }> {
    try {
      // Extract location context from domain research first
      let locationContext = region ? ` in ${region}` : '';
      let inferredBusinessType = businessType;

      // If business type is vague, try to infer it from the domain
      if (!businessType || businessType.toLowerCase() === 'other') {
        // First, do a quick research to understand the business
        const quickResearch = await this.researchCompetitor(
          domain,
          'business',
          '',
        );

        // Extract location from insights if not provided
        if (!region && quickResearch.insights) {
          const locationMatch = quickResearch.insights.match(
            /(?:located in|based in|situated in|near|at)\s+([^,.\n]+(?:,\s*[^,.\n]+)?)/i,
          );
          if (locationMatch) {
            locationContext = ` in ${locationMatch[1].trim()}`;
            this.logger.debug(`Inferred location: ${locationContext}`);
          }
        }

        // Infer business type from products/services
        const productNames = quickResearch.products
          .map((p) => p.name.toLowerCase())
          .join(' ');
        // Generic business type inference based on common patterns
        if (
          productNames.includes('software') ||
          productNames.includes('app') ||
          productNames.includes('platform')
        ) {
          inferredBusinessType = 'software';
        } else if (
          productNames.includes('room') ||
          productNames.includes('suite') ||
          productNames.includes('accommodation')
        ) {
          inferredBusinessType = 'hospitality';
        } else if (
          productNames.includes('course') ||
          productNames.includes('training') ||
          productNames.includes('education')
        ) {
          inferredBusinessType = 'education';
        } else if (
          productNames.includes('consulting') ||
          productNames.includes('advisory') ||
          productNames.includes('services')
        ) {
          inferredBusinessType = 'professional services';
        } else if (
          quickResearch.insights.toLowerCase().includes('retail') ||
          quickResearch.insights.toLowerCase().includes('store')
        ) {
          inferredBusinessType = 'retail';
        } else {
          // Keep it generic if we can't determine
          inferredBusinessType = 'business';
        }

        this.logger.debug(`Inferred business type: ${inferredBusinessType}`);
      }

      const businessTypeSnippet =
        inferredBusinessType && inferredBusinessType !== 'other'
          ? `, a ${inferredBusinessType}`
          : '';

      const jsonSchema = {
        schema: {
          type: 'object',
          properties: {
            competitors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Competitor company name',
                  },
                  domain: {
                    type: 'string',
                    description: 'Competitor domain name (e.g., example.com)',
                  },
                  description: {
                    type: 'string',
                    description: 'Brief description of the competitor',
                  },
                },
                required: ['name', 'domain'],
              },
              description: 'List of competitors',
            },
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'URLs used for research',
            },
          },
          required: ['competitors', 'sources'],
        },
      };

      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a business intelligence analyst specializing in competitive analysis.
          Your task is to identify DIRECT competitors - businesses offering the SAME type of services in the SAME geographic area.
          
          CRITICAL: Focus on businesses that:
          1. Operate in the SAME location/region${locationContext}
          2. Offer similar services/products
          3. Target similar customer segments
          4. Are at a similar price/quality level
          
          DO NOT include:
          - Global chains unless they have properties in the same specific location
          - Businesses in different countries or regions
          - Businesses offering completely different services
          
          Return results following the JSON schema precisely.`,
        },
        {
          role: 'user',
          content: `Find the direct competitors of ${domain}${businessTypeSnippet}${locationContext}.
          
          Focus specifically on:
          1. Other businesses in the SAME geographic area${locationContext}
          2. Businesses offering similar accommodation/services
          3. Businesses targeting similar travelers (e.g., luxury travelers, eco-tourists, etc.)
          
          IMPORTANT: Only include businesses that operate in the same geographic market. For example:
          - If analyzing a hotel in Paris, find other hotels in Paris, not hotels in London
          - If analyzing a software company in Silicon Valley, find other software companies targeting the same market
          - Geographic proximity matters for location-based businesses
          - Market overlap matters for online/digital businesses
          
          Provide their name, domain name, and a brief description. Output according to the JSON schema.`,
        },
      ];

      this.logger.debug(
        `Discovering competitors for: ${domain} (${inferredBusinessType})${locationContext}`,
      );

      const response = await this.perplexityFetch({
        messages,
        temperature: 0.1,
        response_format: { type: 'json_schema', json_schema: jsonSchema },
      });

      const data = await response.json();
      const validatedResponse = PerplexityResponseSchema.parse(data);
      const content = validatedResponse.choices[0]?.message.content || '{}';

      this.logger.debug(
        `Perplexity competitor discovery raw response: ${content.substring(0, 500)}...`,
      );

      try {
        const parsedContent = JSON.parse(content);
        const competitorsList = Array.isArray(parsedContent.competitors)
          ? (parsedContent.competitors as LlmCompetitor[]).map((c) => {
              const cleanedDomain = this.cleanupDomain(
                c.domain ?? c.name ?? '',
              );
              return {
                name: c.name ?? cleanedDomain.split('.')[0],
                domain: cleanedDomain,
                description: c.description ?? '',
              };
            })
          : [];

        this.logger.log(
          `Discovered ${competitorsList.length} competitors: ${competitorsList
            .map((c) => `${c.name} (${c.domain})`)
            .join(', ')}`,
        );

        return {
          competitors: competitorsList,
          sources: Array.isArray(parsedContent.sources)
            ? parsedContent.sources
            : validatedResponse.links || [],
        };
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse JSON response: ${parseError.message}`,
        );
        const extractedCompetitors = this.extractCompetitorsFromText(content);
        return {
          competitors: extractedCompetitors,
          sources: validatedResponse.links || [],
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to discover competitors: ${error.message}`,
        error.stack,
      );
      throw new Error(`Competitor discovery failed: ${error.message}`);
    }
  }

  /**
   * Compare specific products between competitors using Perplexity
   * @param mainDomain Main business domain
   * @param competitorDomains List of competitor domains to compare
   * @param productName Product to compare
   */
  async compareProducts(
    mainDomain: string,
    competitorDomains: string[],
    productName: string,
  ): Promise<{
    comparisons: Array<{
      domain: string;
      productName: string;
      price?: number;
      currency?: string;
      features?: string[];
      advantages?: string[];
      disadvantages?: string[];
    }>;
    sources: string[];
  }> {
    try {
      const competitorsList = competitorDomains.join(', ');
      const jsonSchema = {
        schema: {
          type: 'object',
          properties: {
            comparisons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  domain: {
                    type: 'string',
                    description: 'Competitor domain name',
                  },
                  productName: { type: 'string', description: 'Product name' },
                  price: { type: 'number', description: 'Numerical price' },
                  currency: { type: 'string', description: 'e.g., USD, EUR' },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of key features',
                  },
                  advantages: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Competitive advantages',
                  },
                  disadvantages: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Competitive disadvantages',
                  },
                },
                required: ['domain', 'productName'],
              },
              description: 'Comparison details for each competitor product',
            },
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'URLs used for research',
            },
          },
          required: ['comparisons', 'sources'],
        },
      };

      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a product comparison specialist.
          Compare ${productName} from ${mainDomain} with similar products from these competitors: ${competitorsList}.
          Focus on pricing, features, and competitive advantages/disadvantages.
          Return the results following the JSON schema precisely.`,
        },
        {
          role: 'user',
          content: `Compare ${productName} from ${mainDomain} with similar products from these competitors: ${competitorsList}.
          Focus on extracting precise pricing information, key features, and competitive advantages/disadvantages. Output according to the JSON schema.`,
        },
      ];

      this.logger.debug(
        `Comparing products across: ${mainDomain} and competitors: ${competitorsList}`,
      );

      const response = await this.perplexityFetch({
        messages,
        temperature: 0.1,
        response_format: { type: 'json_schema', json_schema: jsonSchema },
      });

      const data = await response.json();
      const validatedResponse = PerplexityResponseSchema.parse(data);
      const content = validatedResponse.choices[0]?.message.content || '{}';

      try {
        const parsedContent = JSON.parse(content);
        return {
          comparisons: Array.isArray(parsedContent.comparisons)
            ? parsedContent.comparisons
            : [],
          sources: Array.isArray(parsedContent.sources)
            ? parsedContent.sources
            : validatedResponse.links || [],
        };
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse JSON response: ${parseError.message}`,
        );
        return {
          comparisons: [],
          sources: validatedResponse.links || [],
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to compare products: ${error.message}`,
        error.stack,
      );
      throw new Error(`Product comparison failed: ${error.message}`);
    }
  }

  private extractCompetitors(text: string): string[] {
    const regex = /(?:competitor|company|business)(?:s)?:?\s*([^.,;]+)[.,;]/gi;
    const matches = [...text.matchAll(regex)];

    return matches
      .map((match) => match[1]?.trim())
      .filter(Boolean)
      .map((name) => name.replace(/and\s+/g, ''))
      .filter((name) => name.length > 3);
  }

  private extractProducts(text: string): Array<{
    name: string;
    price?: number;
    currency?: string;
    description?: string;
  }> {
    const productRegex =
      /(?:product|service|offering)(?:s)?:?\s*([^.,;]+)[.,;]/gi;
    const priceRegex =
      /(?:(?:price|cost):?\s*)(\$[\d,.]+|[\d,.]+\s*(?:USD|EUR|GBP|CAD|AUD))/gi;

    const productMatches = [...text.matchAll(productRegex)];
    const priceMatches = [...text.matchAll(priceRegex)];

    const products: Array<{
      name: string;
      price?: number;
      currency?: string;
      description?: string;
    }> = [];

    productMatches.forEach((match, index) => {
      const name = match[1]?.trim();
      if (!name || name.length < 3) return;

      let price: number | undefined;
      let currency: string | undefined;

      if (priceMatches[index]) {
        const priceText = priceMatches[index][1];
        if (priceText) {
          if (priceText.startsWith('$')) {
            price = parseFloat(priceText.replace(/[$,]/g, ''));
            currency = 'USD';
          } else {
            const currencyMatch = priceText.match(/(?:USD|EUR|GBP|CAD|AUD)/i);
            if (currencyMatch) {
              currency = currencyMatch[0].toUpperCase();
              price = parseFloat(priceText.replace(/[^\d.]/g, ''));
            }
          }
        }
      }

      products.push({
        name,
        price,
        currency,
      });
    });

    return products;
  }

  private extractCompetitorsFromText(text: string): Array<{
    name: string;
    domain: string;
    description?: string;
  }> {
    const domainRegex =
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/gi;
    const nameRegex =
      /(?:^|\n)([A-Z][A-Za-z0-9\s]+)(?:\s*[-–—]\s*|\s*:\s*|\s*is\s+a\s+)/gm;

    const domainMatches = [...text.matchAll(domainRegex)];
    const nameMatches = [...text.matchAll(nameRegex)];

    const result: Array<{
      name: string;
      domain: string;
      description?: string;
    }> = [];

    domainMatches.forEach((match, index) => {
      const domain = match[0]
        .toLowerCase()
        .replace(/^(?:https?:\/\/)?(?:www\.)?/, '');

      let name = '';
      if (nameMatches[index]) {
        name = nameMatches[index][1].trim();
      } else {
        name =
          domain.split('.')[0].charAt(0).toUpperCase() +
          domain.split('.')[0].slice(1);
      }

      const clean = this.cleanupDomain(domain);

      result.push({
        name,
        domain: clean,
        description: '',
      });
    });

    return result;
  }

  private cleanupDomain(domain: string): string {
    // Ensure we always return just the hostname (no scheme, www, or path)
    try {
      const normalised = domain.startsWith('http')
        ? domain
        : `https://${domain}`;
      const urlObj = new URL(normalised);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
    }
  }
}
