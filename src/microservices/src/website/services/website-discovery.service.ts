import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '../../shared/services/model-manager.service';
import * as cheerio from 'cheerio';
import { ChatGroq } from '@langchain/groq';
import type { Env } from '../../env';
import { JsonUtils } from '@shared/utils';
import * as robotsParser from 'robots-parser';
import { Robot } from 'robots-parser';
import { XMLParser } from 'fast-xml-parser';
import type { RobotsData } from '../interfaces/robots-data.interface';
import type { SitemapData } from '../interfaces/sitemap-data.interface';
import type { PriceData } from '@shared/interfaces/price-data.interface';
import type { WebsiteContent } from '@shared/types';

@Injectable()
export class WebsiteDiscoveryService {
  private readonly logger = new Logger(WebsiteDiscoveryService.name);
  private spider: Spider;
  private readonly MAX_TEXT_LENGTH = 8000;
  private readonly TIMEOUT = 60000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000;
  private readonly USER_AGENTS = {
    desktop:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    mobile:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  };

  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'loc',
    isArray: (name) => ['url', 'sitemap'].includes(name),
  });

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.spider = new Spider({
      apiKey: this.configService.get('SPIDER_API_KEY'),
    });
  }

  async cleanup(): Promise<void> {
    // Wait for any pending operations to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Clear any pending timeouts
    if (typeof global.clearTimeout === 'function') {
      const highestId = Number(setTimeout(() => {}, 0));
      for (let i = 0; i < highestId; i++) {
        clearTimeout(i);
      }
    }
  }

  private async directFetch(
    urlInput: unknown,
    userAgent: string,
  ): Promise<string | null> {
    try {
      // Handle non-string inputs
      let urlStr: string;
      if (typeof urlInput !== 'string') {
        if (urlInput && typeof urlInput === 'object' && 'loc' in urlInput) {
          urlStr = (urlInput as { loc: string }).loc;
        } else {
          this.logger.warn('Invalid URL input:', urlInput);
          return null;
        }
      } else {
        urlStr = urlInput;
      }

      // Ensure URL has protocol
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = `https://${urlStr}`;
      }

      // Validate URL format
      try {
        new URL(urlStr);
      } catch {
        this.logger.warn('Invalid URL format:', urlStr);
        return null;
      }

      // Try HTTPS first
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(urlStr, {
          headers: {
            'User-Agent': userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Handle different HTTP status codes
        if (response.status === 404) {
          this.logger.warn(`Website does not exist: ${urlStr}`);
          return null;
        }
        if (response.status === 403 || response.status === 401) {
          this.logger.warn(`Access denied (possibly blocking): ${urlStr}`);
          throw new Error('ACCESS_DENIED');
        }
        if (response.status === 429) {
          this.logger.warn(`Rate limited: ${urlStr}`);
          throw new Error('RATE_LIMITED');
        }
        if (response.status >= 500) {
          this.logger.warn(`Server error: ${urlStr}`);
          throw new Error('SERVER_ERROR');
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.text();
      } catch (error) {
        // If HTTPS fails, try HTTP
        if (urlStr.startsWith('https://')) {
          const httpUrl = urlStr.replace('https://', 'http://');
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          // Direct fetch without unnecessary try/catch
          const httpResponse = await fetch(httpUrl, {
            headers: {
              'User-Agent': userAgent,
              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Cache-Control': 'no-cache',
            },
            signal: controller.signal,
          }).catch((httpError) => {
            // Let errors fall through to the outer catch
            clearTimeout(timeout);
            throw httpError;
          });

          clearTimeout(timeout);

          // Handle different HTTP status codes for HTTP attempt
          if (httpResponse.status === 404) {
            this.logger.warn(`Website does not exist: ${httpUrl}`);
            return null;
          }
          if (httpResponse.status === 403 || httpResponse.status === 401) {
            this.logger.warn(`Access denied (possibly blocking): ${httpUrl}`);
            throw new Error('ACCESS_DENIED');
          }
          if (httpResponse.status === 429) {
            this.logger.warn(`Rate limited: ${httpUrl}`);
            throw new Error('RATE_LIMITED');
          }
          if (httpResponse.status >= 500) {
            this.logger.warn(`Server error: ${httpUrl}`);
            throw new Error('SERVER_ERROR');
          }

          if (httpResponse.ok) {
            return await httpResponse.text();
          }
        }
        throw error;
      }
    } catch (error: unknown) {
      // Create a safe error object
      type ErrorWithProperties = {
        cause?: unknown;
        code?: string;
        name?: string;
        message?: string;
      };

      const errorObj: ErrorWithProperties =
        error instanceof Error ? error : { message: String(error) };

      const underlying: ErrorWithProperties = errorObj.cause || errorObj;

      const isNotFound =
        underlying.code === 'ENOTFOUND' ||
        underlying.code === 'ECONNREFUSED' ||
        (typeof underlying.message === 'string' &&
          underlying.message.includes('getaddrinfo ENOTFOUND'));

      const isTimeout =
        underlying.code === 'ETIMEDOUT' || underlying.name === 'AbortError';

      if (isNotFound) {
        this.logger.warn(
          `Website does not exist (DNS lookup failed): ${String(urlInput)}`,
        );
        return null;
      }

      if (isTimeout) {
        this.logger.warn(`Timeout fetching website: ${String(urlInput)}`);
        throw new Error('TIMEOUT');
      }

      if (underlying.message?.includes('fetch failed')) {
        this.logger.warn(`Fetch failed for ${String(urlInput)}`);
        throw new Error('FETCH_FAILED');
      }

      if (
        errorObj.message === 'ACCESS_DENIED' ||
        errorObj.message === 'RATE_LIMITED' ||
        errorObj.message === 'SERVER_ERROR'
      ) {
        throw new Error(errorObj.message);
      }

      this.logger.warn('Direct fetch failed:', error);
      throw new Error('FETCH_FAILED');
    }
  }

  private extractStructuredData($: cheerio.Root): Record<string, unknown>[] {
    const structuredData: Record<string, unknown>[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).html();
        if (!content) return;

        const data = JSON.parse(content) as
          | Record<string, unknown>
          | Record<string, unknown>[];
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

  private extractMetaTags($: cheerio.Root): {
    title: string;
    description: string;
  } {
    const title = this.sanitizeText(
      $('title').text() ??
        $("meta[property='og:title']").attr('content') ??
        $("meta[name='twitter:title']").attr('content') ??
        '',
    );

    const description = this.sanitizeText(
      $('meta[name="description"]').attr('content') ??
        $('meta[property="og:description"]').attr('content') ??
        $('meta[name="twitter:description"]').attr('content') ??
        '',
    );

    return { title, description };
  }

  private extractPricing($: cheerio.Root): PriceData[] {
    const priceSelectors = [
      '[itemprop="price"]',
      '.price',
      '[data-price]',
      '[class*="price"]',
      '[id*="price"]',
      'span:contains("$"), span:contains("€"), span:contains("£")',
      'div:contains("USD"), div:contains("EUR"), div:contains("GBP")',
    ];

    const prices: PriceData[] = [];
    const now = new Date();
    const priceRegex =
      /(?<!\S)(?<currency>[$€£]|USD|EUR|GBP)?\s*([\d,.]*?\d+[\d,.]*)(?:\s*(?<currencySuffix>[$€£]|USD|EUR|GBP))?(?!\S)/;
    const decimalSeparator = /[.,](?=\d{2}$)/;
    const thousandsSeparator = /[.,](?=\d{3,}$)/;

    priceSelectors.forEach((selector) => {
      $(selector).each((_, el) => {
        const $el = $(el);
        const text = $el.text().trim();

        // Skip if element is hidden or part of navigation/footer
        if (
          $el.closest('nav, footer, header, script, style').length > 0 ||
          $el.css('display') === 'none' ||
          $el.css('visibility') === 'hidden' ||
          text.includes('@') // Skip email addresses
        )
          return;

        const match = priceRegex.exec(text);
        if (match?.groups) {
          let numericValue = match[2]
            .replace(thousandsSeparator, '')
            .replace(decimalSeparator, '.');

          // Handle European-style decimal commas
          if (
            numericValue.includes(',') &&
            numericValue.split(',')[1]?.length === 2
          ) {
            numericValue = numericValue.replace(',', '.');
          }

          const price = parseFloat(numericValue);
          const currency = (
            match.groups.currency ||
            match.groups.currencySuffix ||
            '$'
          )
            .replace('USD', '$')
            .replace('EUR', '€')
            .replace('GBP', '£');

          if (
            !isNaN(price) &&
            price > 0 &&
            price < 1000000 &&
            numericValue.split('.')[1]?.length <= 2
          ) {
            prices.push({
              price: Number(price.toFixed(2)),
              currency,
              timestamp: now,
              source: selector,
            });
          }
        }
      });
    });

    return prices;
  }

  private extractContactInfo($: cheerio.Root): { address?: string } {
    const contactInfo: { address?: string } = {};

    const addressData = this.extractStructuredData($).find(
      (data) =>
        (data['@type'] === 'PostalAddress' ||
          data['@type'] === 'LocalBusiness') &&
        'address' in data,
    );

    if (addressData) {
      // Type guard to make TypeScript happy
      type AddressObject = Record<string, unknown>;

      if (
        typeof addressData.address === 'object' &&
        addressData.address &&
        'streetAddress' in addressData.address
      ) {
        const addressObj = addressData.address as AddressObject;
        contactInfo.address = String(addressObj.streetAddress);
      } else if ('streetAddress' in addressData) {
        contactInfo.address = String(addressData.streetAddress);
      } else if (addressData.address) {
        contactInfo.address =
          typeof addressData.address === 'string'
            ? addressData.address
            : Object.values(addressData.address as Record<string, unknown>)
                .filter((v) => typeof v === 'string')
                .join(', ');
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

  private async analyzeContentWithLLM(
    cleanedContent: string,
    structuredData: Record<string, unknown>[],
  ): Promise<{
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

    const result = await this.modelManager.withBatchProcessing(
      async (llm: ChatGroq) => {
        return await llm.invoke(prompt);
      },
      prompt,
    );

    // Type for the parsed JSON result
    type ParsedWebsiteData = {
      products?: Array<{
        name: string;
        url?: string;
        price?: number;
        currency?: string;
        description?: string;
        category?: string;
      }>;
      services?: Array<{
        name: string;
        url?: string;
        price?: number;
        currency?: string;
        description?: string;
        category?: string;
      }>;
    };

    const content =
      typeof result.content === 'string'
        ? result.content
        : JSON.stringify(result.content);

    const jsonStr = JsonUtils.extractJSON(content, 'object');
    const parsed = JSON.parse(jsonStr) as ParsedWebsiteData;

    return {
      products: this.validateAndNormalizeOfferings(parsed.products ?? []),
      services: this.validateAndNormalizeOfferings(parsed.services ?? []),
    };
  }

  private validateAndNormalizeOfferings<T>(offerings: T[]): T[] {
    return offerings
      .filter((offering) => {
        try {
          const required = ['name'];
          const obj = offering as Record<string, unknown>;
          return required.every((field) => obj[field]);
        } catch {
          return false;
        }
      })
      .map((offering) => {
        const obj = offering as Record<string, unknown>;
        const normalized = {
          ...offering,
          price: obj.price || null,
          currency: obj.currency || 'USD',
          url: obj.url || null,
          description: obj.description || null,
          category: obj.category || null,
        };

        // Normalize currency symbols
        if (typeof normalized.currency === 'string') {
          normalized.currency = normalized.currency
            .replace('USD', '$')
            .replace('EUR', '€')
            .replace('GBP', '£');
        }

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
      .map((text) => this.sanitizeText(text))
      .filter((text) => text.length > 0);

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

  private normalizeUrl(urlInput: unknown, protocol = 'https'): string {
    try {
      // Handle non-string inputs
      let urlStr: string;
      if (typeof urlInput !== 'string') {
        if (urlInput && typeof urlInput === 'object' && 'loc' in urlInput) {
          urlStr = (urlInput as { loc: string }).loc;
        } else {
          this.logger.warn('Invalid URL input:', urlInput);
          return '';
        }
      } else {
        urlStr = urlInput;
      }

      urlStr = urlStr.trim();

      try {
        return new URL(urlStr).toString();
      } catch {
        // If parsing fails, assume it's a domain name
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
          urlStr = `${protocol}://${urlStr}`;
        }
        return new URL(urlStr).toString();
      }
    } catch {
      this.logger.warn('Failed to normalize URL:', urlInput);
      return typeof urlInput === 'string' ? urlInput : '';
    }
  }

  private getDomainFromUrl(url: string): string {
    try {
      const parsed = new URL(this.normalizeUrl(url));
      return parsed.hostname.replace(/^www\./, '');
    } catch (error: unknown) {
      console.warn(
        'Failed to get domain from URL:',
        url,
        error instanceof Error ? error.message : String(error),
      );
      return url.replace(/^www\./, '');
    }
  }

  async fetchRobotsTxt(domain: string): Promise<RobotsData | null> {
    try {
      const baseUrl = this.normalizeUrl(domain);
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const response = await this.directFetch(
        robotsUrl,
        this.USER_AGENTS.desktop,
      );

      if (!response) return null;

      // Type-safe robotsParser handling
      type RobotsParserFunction = (url: string, content: string) => Robot;

      // Handle both ESM and CommonJS import formats of robots-parser
      let parserFunction: RobotsParserFunction;
      if (
        typeof (robotsParser as unknown as { default?: RobotsParserFunction })
          .default === 'function'
      ) {
        parserFunction = (
          robotsParser as unknown as { default: RobotsParserFunction }
        ).default;
      } else {
        parserFunction = robotsParser as unknown as RobotsParserFunction;
      }

      const robots: Robot = parserFunction(robotsUrl, response);

      // Parse robots.txt content directly
      const lines = response.split('\n');
      const disallowedPaths: string[] = [];
      const allowedPaths: string[] = [];

      lines.forEach((line) => {
        const [directive, ...pathParts] = line.split(':').map((p) => p.trim());
        const path = pathParts.join(':');

        if (directive.toLowerCase() === 'disallow' && path) {
          disallowedPaths.push(path);
        } else if (directive.toLowerCase() === 'allow' && path) {
          allowedPaths.push(path);
        }
      });

      return {
        sitemaps: robots.getSitemaps() || [],
        allowedPaths: allowedPaths.length ? allowedPaths : ['/'],
        disallowedPaths,
        crawlDelay: robots.getCrawlDelay('*') ?? undefined,
      };
    } catch (error) {
      this.logger.warn('Failed to fetch robots.txt:', error);
      return null;
    }
  }

  private async fetchSitemap(url: string): Promise<SitemapData[]> {
    try {
      const response = await this.directFetch(url, this.USER_AGENTS.desktop);
      if (!response) return [];

      // Handle plain text sitemaps (one URL per line)
      if (!response.trim().startsWith('<?xml')) {
        return response
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && line.includes('http'))
          .map((loc) => ({ loc }));
      }

      // Parse XML to object
      let parsed: Record<string, unknown>;
      try {
        parsed = this.xmlParser.parse(response) as Record<string, unknown>;
      } catch (error) {
        this.logger.warn(`Failed to parse sitemap XML ${url}:`, error);
        return [];
      }

      // Handle sitemap index files
      if (parsed.sitemapindex && typeof parsed.sitemapindex === 'object') {
        const sitemapIndex = parsed.sitemapindex as Record<string, unknown>;

        if (sitemapIndex.sitemap && Array.isArray(sitemapIndex.sitemap)) {
          const sitemaps: Promise<SitemapData[]>[] = [];

          for (const sitemap of sitemapIndex.sitemap) {
            if (!sitemap || typeof sitemap !== 'object') continue;

            let loc: string | undefined;
            const sitemapObj = sitemap as Record<string, unknown>;

            if (typeof sitemapObj.loc === 'string') {
              loc = sitemapObj.loc;
            } else if (sitemapObj.loc && typeof sitemapObj.loc === 'object') {
              const locObj = sitemapObj.loc as Record<string, unknown>;
              if (typeof locObj.loc === 'string') {
                loc = locObj.loc;
              }
            }

            if (loc) {
              sitemaps.push(this.fetchSitemap(loc));
            }
          }

          const results = await Promise.all(sitemaps);
          return results.flat();
        }
      }

      // Handle regular sitemaps
      if (parsed.urlset && typeof parsed.urlset === 'object') {
        const urlset = parsed.urlset as Record<string, unknown>;

        if (urlset.url && Array.isArray(urlset.url)) {
          const entries: SitemapData[] = [];

          for (const entry of urlset.url) {
            if (!entry || typeof entry !== 'object') continue;

            const entryObj = entry as Record<string, unknown>;
            let loc: string | undefined;

            if (typeof entryObj.loc === 'string') {
              loc = entryObj.loc;
            } else if (entryObj.loc && typeof entryObj.loc === 'object') {
              const locObj = entryObj.loc as Record<string, unknown>;
              if (typeof locObj.loc === 'string') {
                loc = locObj.loc;
              }
            }

            if (!loc) continue;

            let priority: number | undefined;
            if (entryObj.priority && typeof entryObj.priority === 'string') {
              const parsedPriority = parseFloat(entryObj.priority);
              if (!isNaN(parsedPriority)) {
                priority = parsedPriority;
              }
            }

            entries.push({
              loc,
              lastmod:
                typeof entryObj.lastmod === 'string'
                  ? entryObj.lastmod
                  : undefined,
              changefreq:
                typeof entryObj.changefreq === 'string'
                  ? entryObj.changefreq
                  : undefined,
              priority,
            });
          }

          return entries;
        }
      }

      return [];
    } catch (error) {
      this.logger.warn(`Failed to fetch sitemap ${url}:`, error);
      return [];
    }
  }

  async discoverSitemaps(domain: string): Promise<SitemapData[]> {
    const results: SitemapData[] = [];
    const processed = new Set<string>();

    // Try robots.txt first
    const robotsData = await this.fetchRobotsTxt(domain);
    const sitemapUrls = new Set<string>();

    if (robotsData?.sitemaps) {
      robotsData.sitemaps
        .filter((url): url is string => typeof url === 'string')
        .forEach((url) => sitemapUrls.add(this.normalizeUrl(url)));
    }

    // Try common sitemap locations
    const baseUrl = this.normalizeUrl(domain);
    const commonLocations = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap/sitemap.xml',
      '/sitemaps/sitemap.xml',
      '/product-sitemap.xml',
      '/products-sitemap.xml',
      '/category-sitemap.xml',
    ];

    for (const path of commonLocations) {
      try {
        sitemapUrls.add(new URL(path, baseUrl).toString());
      } catch (error) {
        this.logger.warn(`Failed to construct sitemap URL for ${path}:`, error);
      }
    }

    // Fetch all discovered sitemaps
    for (const url of sitemapUrls) {
      if (processed.has(url)) continue;
      processed.add(url);

      const entries = await this.fetchSitemap(url);
      results.push(...entries);
    }

    // Type-safe de-duplication
    return [...new Set(results.map((r) => JSON.stringify(r)))].map(
      (r): SitemapData => JSON.parse(r) as SitemapData,
    );
  }

  async discoverWebsiteContent(domain: string): Promise<WebsiteContent> {
    this.logger.debug(`Starting website content discovery for ${domain}`);
    let retries = 0;

    // Normalize domain format
    domain = this.normalizeUrl(domain);

    while (retries < this.MAX_RETRIES) {
      try {
        // First attempt: Direct fetch with desktop user agent
        let html = await this.directFetch(domain, this.USER_AGENTS.desktop);

        // If website doesn't exist, return early with empty content
        if (html === null) {
          this.logger.warn(`Website ${domain} does not exist`);
          return {
            url: domain,
            title: '',
            description: '',
            products: [],
            services: [],
            categories: [],
            keywords: [],
            mainContent: '',
            metadata: {
              structuredData: [],
              contactInfo: {},
              prices: [],
            },
          };
        }

        // Second attempt: Direct fetch with mobile user agent
        if (!html) {
          html = await this.directFetch(domain, this.USER_AGENTS.mobile);
        }

        // Final attempt: Use spider if direct fetches fail
        if (!html) {
          this.logger.debug('Direct fetches failed, using spider');
          try {
            const spiderResult = await this.spider.crawlUrl(domain, {
              limit: 1,
              store_data: true,
              metadata: true,
              request: 'smart',
              headers: { 'User-Agent': this.USER_AGENTS.desktop },
            });

            if (Array.isArray(spiderResult) && spiderResult.length > 0) {
              const firstResult = spiderResult[0];
              html = firstResult?.content ?? null;
            }
          } catch {
            this.logger.debug(
              'Spider crawl failed, continuing with other methods',
            );
          }
        }

        if (!html) {
          throw new Error('FETCH_FAILED');
        }

        const $ = cheerio.load(html);

        // Clean and prepare text
        const cleanedText = this.prepareTextForAnalysis(
          [this.extractCleanText(html)],
          this.MAX_TEXT_LENGTH,
        );

        // Initialize content structure
        const content: WebsiteContent = {
          url: domain,
          title: '',
          description: '',
          products: [],
          services: [],
          categories: [],
          keywords: [],
          mainContent: '',
          metadata: {
            structuredData: [],
            contactInfo: {},
            prices: [],
          },
        };

        // Extract metadata
        const metaTags = this.extractMetaTags($);
        content.title = metaTags.title;
        content.description = metaTags.description;

        // Extract structured data
        const structuredData = this.extractStructuredData($);
        content.metadata!.structuredData = structuredData;

        // Extract contact info
        content.metadata!.contactInfo = this.extractContactInfo($);

        // Extract pricing
        content.metadata!.prices = this.extractPricing($);

        // Analyze content with LLM
        const offerings = await this.analyzeContentWithLLM(
          cleanedText,
          structuredData,
        );
        content.products = offerings.products;
        content.services = offerings.services;

        this.logger.debug(`Website content discovery completed for ${domain}`);
        return content;
      } catch (error: unknown) {
        // Type guard for Error objects
        if (!(error instanceof Error)) {
          this.logger.warn(
            `Unknown error type for ${domain}: ${String(error)}`,
          );
          retries++;
          continue;
        }

        // Handle specific error cases
        if (error.message === 'ACCESS_DENIED') {
          this.logger.warn(`Access denied for ${domain}`);
          break;
        }

        if (error.message === 'RATE_LIMITED' && retries < this.MAX_RETRIES) {
          const delay = Math.pow(2, retries) * this.RETRY_DELAY;
          this.logger.warn(
            `Rate limited by ${domain}, waiting ${delay / 1000}s before retry`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retries++;
          continue;
        }

        // Handle DNS and network errors
        if (
          ('code' in error && error.code === 'ENOTFOUND') ||
          error.message.includes('getaddrinfo ENOTFOUND')
        ) {
          this.logger.warn(`Domain not found: ${domain}`);
          break;
        }

        if (
          ('code' in error && error.code === 'ETIMEDOUT') ||
          error.name === 'AbortError'
        ) {
          this.logger.warn(`Connection timed out: ${domain}`);
        }

        retries++;
        if (retries < this.MAX_RETRIES) {
          this.logger.debug(
            `Attempt ${retries} failed, retrying in ${this.RETRY_DELAY / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
          continue;
        }

        this.logger.warn(
          `Failed to discover website content for ${domain} after ${retries} attempts`,
        );
      }
    }

    // Return empty content for failed attempts
    return {
      url: domain,
      title: '',
      description: '',
      products: [],
      services: [],
      categories: [],
      keywords: [],
      mainContent: '',
      metadata: {
        structuredData: [],
        contactInfo: {},
        prices: [],
      },
    };
  }

  async deepCrawlCompetitor(
    domain: string,
    robotsData: RobotsData | null,
  ): Promise<WebsiteContent> {
    this.logger.log(`Starting deep crawl for ${domain}`);
    const urls = new Set<string>();
    const crawled = new Set<string>();
    const maxUrls = 100; // Limit to prevent excessive crawling

    // Start with sitemap URLs if available
    const sitemapData = await this.discoverSitemaps(domain);
    sitemapData
      .filter((entry) => typeof entry.loc === 'string')
      .forEach((entry) => urls.add(this.normalizeUrl(entry.loc)));

    // Add homepage if no sitemap
    if (urls.size === 0) {
      urls.add(this.normalizeUrl(domain));
    }

    const results: WebsiteContent[] = [];

    for (const url of urls) {
      if (crawled.size >= maxUrls) break;
      if (crawled.has(url)) continue;

      // Check robots.txt rules with more lenient approach
      if (robotsData) {
        try {
          const urlPath = new URL(url).pathname;

          // Skip only if path matches a disallow rule AND doesn't match any allow rule
          const isDisallowed = robotsData.disallowedPaths.some((pattern) => {
            // Convert wildcard pattern to regex
            const regexPattern = pattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            return new RegExp(`^${regexPattern}`).test(urlPath);
          });

          const isAllowed = robotsData.allowedPaths.some((pattern) => {
            const regexPattern = pattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            return new RegExp(`^${regexPattern}`).test(urlPath);
          });

          if (isDisallowed && !isAllowed) {
            this.logger.debug(`Skipping explicitly disallowed path: ${url}`);
            continue;
          }
        } catch {
          this.logger.debug(`Failed to check robots.txt rules for ${url}`);
        }
      }

      try {
        crawled.add(url);
        this.logger.debug(`Crawling ${url} (${crawled.size}/${maxUrls})`);

        const content = await this.discoverWebsiteContent(url);
        results.push(content);

        // Respect crawl delay if specified
        if (robotsData?.crawlDelay) {
          await new Promise((resolve) =>
            setTimeout(resolve, (robotsData.crawlDelay ?? 1) * 1000),
          );
        }
      } catch (error) {
        // Handle expected errors with simple messages
        if (error instanceof Error) {
          if (error.message === 'WEBSITE_NOT_FOUND') {
            this.logger.warn(`Website ${url} does not exist`);
          } else if (error.message === 'ACCESS_DENIED') {
            this.logger.warn(`Access denied for ${url}`);
          } else if (error.message === 'RATE_LIMITED') {
            this.logger.warn(`Rate limited by ${url}`);
          } else if (error.message.includes('ENOTFOUND')) {
            this.logger.warn(`Domain not found: ${url}`);
          } else if (error.message.includes('ETIMEDOUT')) {
            this.logger.warn(`Connection timed out: ${url}`);
          } else {
            // Only log full stack trace for unexpected errors
            this.logger.error(`Failed to crawl ${url}:`, error.stack);
          }
        }
      }
    }

    if (results.length === 0) {
      this.logger.warn(`No content could be crawled for ${domain}`);
      return {
        url: this.normalizeUrl(domain),
        title: '',
        description: '',
        products: [],
        services: [],
        categories: [],
        keywords: [],
        mainContent: '',
        metadata: {
          structuredData: [],
          contactInfo: {},
          prices: [],
        },
      };
    }

    // Merge all discovered content
    return {
      url: this.normalizeUrl(domain),
      title: results[0]?.title ?? '',
      description: results[0]?.description ?? '',
      products: this.validateAndNormalizeOfferings(
        results.flatMap((r) => r.products ?? []),
      ),
      services: this.validateAndNormalizeOfferings(
        results.flatMap((r) => r.services ?? []),
      ),
      categories: [...new Set(results.flatMap((r) => r.categories ?? []))],
      keywords: [...new Set(results.flatMap((r) => r.keywords ?? []))],
      mainContent: results.map((r) => r.mainContent ?? '').join('\n'),
      metadata: {
        structuredData: results.flatMap(
          (r) => r.metadata?.structuredData ?? [],
        ),
        contactInfo: results[0]?.metadata?.contactInfo ?? {},
        prices: results.flatMap((r) => r.metadata?.prices ?? []),
      },
    };
  }
}
