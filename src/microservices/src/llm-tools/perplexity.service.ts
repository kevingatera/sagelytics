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

type PerplexityMessage = {
  role: 'user' | 'system' | 'assistant';
  content: string;
};

@Injectable()
export class PerplexityService {
  private readonly logger = new Logger(PerplexityService.name);
  private readonly baseUrl = 'https://api.perplexity.ai';
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('PERPLEXITY_API_KEY');
    this.logger.log('Perplexity service initialized');
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

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages,
          temperature: 0.1,
          max_tokens: 2048,
          web_search_options: {
            search_context_size: 'high',
          },
        }),
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
    insights: string;
    products: Array<{
      name: string;
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
                  price: { type: 'number', description: 'Numerical price' },
                  currency: { type: 'string', description: 'e.g., USD, EUR' },
                  description: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                },
                required: ['name'],
              },
              description: 'Array of products/services offered',
            },
            sources: {
              type: 'array',
              items: { type: 'string' },
              description: 'URLs used for research',
            },
          },
          required: ['insights', 'products', 'sources'],
        },
      };

      const messages: PerplexityMessage[] = [
        {
          role: 'system',
          content: `You are a business analyst specialized in competitive intelligence.
          Research the ${businessType} business at ${domain} and extract detailed information about their products, services, and pricing.
          Follow the provided JSON schema precisely.`,
        },
        {
          role: 'user',
          content: productQuery
            ? `Research ${domain} with focus on their ${productQuery}. Extract all pricing and competitive details according to the JSON schema.`
            : `Research ${domain} and provide a complete analysis of their products, services, pricing, and competitive positioning in the ${businessType} industry according to the JSON schema.`,
        },
      ];

      this.logger.debug(`Researching competitor: ${domain} (${businessType})`);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages,
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_schema', json_schema: jsonSchema },
          web_search_options: {
            search_context_size: 'high',
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API request failed: status ${response.status}, body: ${errorBody}`,
        );
      }

      const data = await response.json();
      const validatedResponse = PerplexityResponseSchema.parse(data);
      const content = validatedResponse.choices[0]?.message.content || '{}';

      try {
        const parsedContent = JSON.parse(content);
        return {
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
      const locationContext = region ? ` in ${region}` : '';
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
          content: `You are a business intelligence analyst that identifies competitors.
          Find the main competitors of ${domain}, a ${businessType} business${locationContext}.
          Return the results following the JSON schema precisely.`,
        },
        {
          role: 'user',
          content: `Who are the top competitors of ${domain}? Find businesses that offer similar products/services ${locationContext}.
          For each competitor, provide their name, domain name, and a brief description. Output according to the JSON schema.`,
        },
      ];

      this.logger.debug(
        `Discovering competitors for: ${domain} (${businessType})${locationContext}`,
      );

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages,
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_schema', json_schema: jsonSchema },
          web_search_options: {
            search_context_size: 'high',
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API request failed: status ${response.status}, body: ${errorBody}`,
        );
      }

      const data = await response.json();
      const validatedResponse = PerplexityResponseSchema.parse(data);
      const content = validatedResponse.choices[0]?.message.content || '{}';

      try {
        const parsedContent = JSON.parse(content);
        return {
          competitors: Array.isArray(parsedContent.competitors)
            ? parsedContent.competitors
            : [],
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

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages,
          temperature: 0.1,
          max_tokens: 2048,
          response_format: { type: 'json_schema', json_schema: jsonSchema },
          web_search_options: {
            search_context_size: 'high',
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API request failed: status ${response.status}, body: ${errorBody}`,
        );
      }

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

      result.push({
        name,
        domain,
        description: '',
      });
    });

    return result;
  }
}
