import { Injectable, Logger } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { WebsiteDiscoveryService } from './website-discovery.service';
import type { WebsiteContent } from '../../interfaces/website-content.interface';
import type { RobotsData } from '../../interfaces/robots-data.interface';
import type { SitemapData } from '../../interfaces/sitemap-data.interface';

@Injectable()
export class SmartCrawlerService {
  private readonly logger = new Logger(SmartCrawlerService.name);
  private readonly MAX_PAGES_PER_DEPTH = 10;
  private readonly MAX_DEPTH = 3;
  private readonly LLM_URL_THRESHOLD = 50;

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService
  ) {}

  async smartCrawl(
    domain: string,
    robotsData: RobotsData | null,
    sitemapData: SitemapData[]
  ): Promise<WebsiteContent> {
    this.logger.log(`Starting smart crawl for ${domain}`);
    const results: WebsiteContent[] = [];
    const crawled = new Set<string>();
    const urlsByDepth: Map<number, Set<string>> = new Map();

    // Initialize with homepage at depth 0
    urlsByDepth.set(0, new Set([`https://${domain}`]));

    // Add sitemap URLs if available, using LLM for large sitemaps
    if (sitemapData.length > this.LLM_URL_THRESHOLD) {
      const prioritizedUrls = await this.prioritizeUrlsWithLLM(sitemapData);
      urlsByDepth.set(1, new Set(prioritizedUrls));
    } else {
      urlsByDepth.set(1, new Set(sitemapData.map(entry => entry.loc)));
    }

    // Crawl each depth level
    for (let depth = 0; depth <= this.MAX_DEPTH; depth++) {
      const urls = urlsByDepth.get(depth) || new Set<string>();
      this.logger.log(`Crawling depth ${depth} with ${urls.size} URLs`);

      // Prioritize URLs at current depth if too many
      let urlsToProcess = [...urls];
      if (urlsToProcess.length > this.MAX_PAGES_PER_DEPTH) {
        if (depth === 0) {
          // For depth 0, just keep homepage
          urlsToProcess = urlsToProcess.slice(0, 1);
        } else {
          urlsToProcess = await this.prioritizeUrlsWithLLM(urlsToProcess);
        }
      }

      // Process URLs at current depth
      for (const url of urlsToProcess) {
        if (crawled.has(url)) continue;
        
        // Check robots.txt rules
        if (robotsData) {
          try {
            const urlPath = new URL(url).pathname;
            if (robotsData.disallowedPaths.some(path => urlPath.startsWith(path))) {
              this.logger.debug(`Skipping disallowed path: ${url}`);
              continue;
            }
          } catch (error) {
            this.logger.warn(`Invalid URL ${url}:`, error);
            continue;
          }
        }

        try {
          crawled.add(url);
          this.logger.debug(`Crawling ${url} at depth ${depth}`);
          
          const content = await this.websiteDiscovery.discoverWebsiteContent(url);
          results.push(content);

          // Extract and add new URLs for next depth
          if (depth < this.MAX_DEPTH) {
            const newUrls = this.extractUrlsFromContent(content, domain);
            const nextDepthUrls = urlsByDepth.get(depth + 1) || new Set<string>();
            newUrls.forEach(newUrl => nextDepthUrls.add(newUrl));
            urlsByDepth.set(depth + 1, nextDepthUrls);
          }

          // Respect crawl delay
          if (robotsData?.crawlDelay) {
            await new Promise(resolve => 
              setTimeout(resolve, (robotsData.crawlDelay || 1) * 1000)
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to crawl ${url}:`, error);
        }
      }
    }

    // Merge all discovered content
    return this.mergeWebsiteContent(results);
  }

  private async prioritizeUrlsWithLLM(urls: string[] | SitemapData[]): Promise<string[]> {
    const prompt = `Analyze these URLs and select the top ${this.MAX_PAGES_PER_DEPTH} most likely to contain valuable competitor information like products, services, pricing, or business details.

    URLs to analyze:
    ${JSON.stringify(urls, null, 2)}

    Consider these factors:
    1. Product/category pages
    2. Service description pages
    3. Pricing pages
    4. About/Company pages
    5. Contact/Location pages

    Return ONLY a JSON array of the top ${this.MAX_PAGES_PER_DEPTH} most relevant URLs.
    Example: ["https://example.com/products", "https://example.com/services"]`;

    try {
      const result = await this.modelManager.withBatchProcessing(async (llm) => {
        return await llm.invoke(prompt);
      }, prompt);

      const selectedUrls = JSON.parse(result.content.toString());
      return selectedUrls.slice(0, this.MAX_PAGES_PER_DEPTH);
    } catch (error) {
      this.logger.error('Failed to prioritize URLs with LLM:', error);
      // Fallback to basic prioritization
      return this.basicUrlPrioritization(urls);
    }
  }

  private basicUrlPrioritization(urls: string[] | SitemapData[]): string[] {
    const priorityKeywords = [
      'product', 'service', 'pricing', 'price',
      'about', 'contact', 'location', 'store'
    ];

    const urlStrings = urls.map(url => 
      typeof url === 'string' ? url : url.loc
    );

    return urlStrings
      .sort((a, b) => {
        const aScore = priorityKeywords.reduce((score, keyword) =>
          score + (a.toLowerCase().includes(keyword) ? 1 : 0), 0
        );
        const bScore = priorityKeywords.reduce((score, keyword) =>
          score + (b.toLowerCase().includes(keyword) ? 1 : 0), 0
        );
        return bScore - aScore;
      })
      .slice(0, this.MAX_PAGES_PER_DEPTH);
  }

  private extractUrlsFromContent(content: WebsiteContent, domain: string): string[] {
    const urls = new Set<string>();

    // Extract URLs from structured data
    content.metadata?.structuredData?.forEach(data => {
      const extractUrls = (obj: any) => {
        Object.values(obj).forEach(value => {
          if (typeof value === 'string' && value.startsWith('http')) {
            try {
              const url = new URL(value);
              if (url.hostname.includes(domain)) {
                urls.add(value);
              }
            } catch {}
          } else if (typeof value === 'object' && value !== null) {
            extractUrls(value);
          }
        });
      };
      extractUrls(data);
    });

    // Extract URLs from products and services
    content.products?.forEach(product => {
      if ('url' in product && typeof product.url === 'string') {
        urls.add(product.url);
      }
    });
    content.services?.forEach(service => {
      if ('url' in service && typeof service.url === 'string') {
        urls.add(service.url);
      }
    });

    return [...urls];
  }

  private mergeWebsiteContent(contents: WebsiteContent[]): WebsiteContent {
    if (contents.length === 0) {
      return {
        url: '',
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
          prices: []
        }
      };
    }

    return {
      url: contents[0].url,
      title: contents[0].title,
      description: contents[0].description,
      products: [...new Set(contents.flatMap(c => c.products || []))],
      services: [...new Set(contents.flatMap(c => c.services || []))],
      categories: [...new Set(contents.flatMap(c => c.categories || []))],
      keywords: [...new Set(contents.flatMap(c => c.keywords || []))],
      mainContent: contents.map(c => c.mainContent || '').join('\n'),
      metadata: {
        structuredData: contents.flatMap(c => c.metadata?.structuredData || []),
        contactInfo: contents[0]?.metadata?.contactInfo || {},
        prices: contents.flatMap(c => c.metadata?.prices || [])
      }
    };
  }
} 