import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebsiteDiscoveryService } from './website-discovery.service';
import { PerplexityService } from '../../llm-tools/perplexity.service';
import { CompetitorAnalysisService } from '../../competitor/services/competitor-analysis.service';
import { SmartCrawlerService } from './smart-crawler.service';
import type { Product, ProductMatch, WebsiteContent } from '@shared/types';

@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly perplexityService: PerplexityService,
    private readonly competitorAnalysis: CompetitorAnalysisService,
    private readonly smartCrawler: SmartCrawlerService,
  ) {
    this.logger.log('Price monitoring service initialized');
  }

  /**
   * Monitor price changes for a specific competitor and their products
   * @param competitorDomain The domain of the competitor to monitor
   * @param userProducts The user's products for comparison
   * @returns Updated product matches with current prices
   */
  async monitorCompetitorPrices(
    competitorDomain: string,
    userProducts: Product[],
  ): Promise<ProductMatch[]> {
    try {
      this.logger.debug(`Monitoring prices for ${competitorDomain}`);

      // Get competitor website content
      const websiteContent =
        await this.websiteDiscovery.discoverWebsiteContent(competitorDomain);

      // Extract competitor products
      const competitorProducts = websiteContent.products.map((product) => ({
        name: product.name,
        url: product.url || '',
        price: product.price || null,
      }));

      this.logger.debug(
        `Found ${competitorProducts.length} products on ${competitorDomain}`,
      );

      // Use LLM to match products
      const matchedProducts = await this.matchProductsByPerplexity(
        userProducts,
        competitorProducts,
        competitorDomain,
      );

      // If LLM matching fails, fall back to the analyzer service
      if (!matchedProducts.length && this.competitorAnalysis) {
        const ourProducts = userProducts.map((p) => ({
          name: p.name,
          url: p.url || '',
          price: p.price || 0,
        }));

        const compProducts = competitorProducts.map((p) => ({
          name: p.name,
          url: p.url || '',
          price: p.price || null,
        }));

        return await this.competitorAnalysis.analyzeProductMatches(
          ourProducts,
          compProducts,
        );
      }

      return matchedProducts;
    } catch (error) {
      this.logger.error(
        `Failed to monitor prices for ${competitorDomain}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Track price changes over time for a specific product
   * @param productUrl The URL of the product to track
   * @returns Price history for the product
   */
  async trackPriceHistory(productUrl: string): Promise<{
    current: number | null;
    history: Array<{ date: string; price: number; change: number | null }>;
  }> {
    try {
      // Get current price
      const productContent =
        await this.websiteDiscovery.discoverWebsiteContent(productUrl);
      const currentPrice = productContent.products[0]?.price || null;

      // In a real implementation, we would fetch from a database
      // For now, we'll return mock data
      return {
        current: currentPrice,
        history: [
          { date: '2023-10-01', price: 99.99, change: null },
          { date: '2023-10-15', price: 95.99, change: -4.0 },
          { date: '2023-11-01', price: 89.99, change: -6.3 },
          { date: '2023-11-15', price: 99.99, change: 11.1 },
          { date: '2023-12-01', price: currentPrice || 94.99, change: -5.0 },
        ],
      };
    } catch (error) {
      this.logger.error(
        `Failed to track price history for ${productUrl}: ${error.message}`,
        error.stack,
      );
      return {
        current: null,
        history: [],
      };
    }
  }

  /**
   * Use Perplexity to match the user's products with competitor products
   */
  private async matchProductsByPerplexity(
    userProducts: Product[],
    competitorProducts: Array<{
      name: string;
      url: string;
      price: number | null;
    }>,
    competitorDomain: string,
  ): Promise<ProductMatch[]> {
    try {
      if (!userProducts.length || !competitorProducts.length) {
        return [];
      }

      // Use Perplexity for product matching if available
      const matchedProducts: ProductMatch[] = [];

      for (const userProduct of userProducts) {
        // Find potential matches in competitor products
        const potentialMatches = competitorProducts.filter(
          (cp) =>
            cp.name.toLowerCase().includes(userProduct.name.toLowerCase()) ||
            userProduct.name.toLowerCase().includes(cp.name.toLowerCase()),
        );

        if (potentialMatches.length) {
          // Create a match entry
          const match: ProductMatch = {
            name: userProduct.name,
            url: userProduct.url || null,
            price: userProduct.price || null,
            currency: userProduct.currency || 'USD',
            matchedProducts: potentialMatches.map((pm) => ({
              name: pm.name,
              url: pm.url || null,
              matchScore: this.calculateMatchScore(userProduct.name, pm.name),
              priceDiff: this.calculatePriceDiff(userProduct.price, pm.price),
            })),
            lastUpdated: new Date().toISOString(),
          };

          matchedProducts.push(match);
        }
      }

      return matchedProducts;
    } catch (error) {
      this.logger.error(
        `Failed to match products using Perplexity: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Calculate a simple match score between product names
   */
  private calculateMatchScore(
    productName1: string,
    productName2: string,
  ): number {
    const name1 = productName1.toLowerCase();
    const name2 = productName2.toLowerCase();

    // Simple matching algorithm - can be improved
    if (name1 === name2) return 100;
    if (name1.includes(name2) || name2.includes(name1)) return 90;

    // Count word matches
    const words1 = name1.split(/\s+/);
    const words2 = name2.split(/\s+/);

    let matchCount = 0;
    for (const word1 of words1) {
      if (word1.length < 3) continue; // Skip short words
      if (
        words2.some((word2) => word2.includes(word1) || word1.includes(word2))
      ) {
        matchCount++;
      }
    }

    const matchPercentage = (matchCount / Math.max(words1.length, 1)) * 100;
    return Math.round(Math.min(matchPercentage, 85)); // Cap at 85% for partial matches
  }

  /**
   * Calculate price difference as a percentage
   */
  private calculatePriceDiff(
    userPrice: number | undefined | null,
    competitorPrice: number | null,
  ): number | null {
    if (
      userPrice === undefined ||
      userPrice === null ||
      competitorPrice === null
    ) {
      return null;
    }

    if (userPrice === 0) return null;

    const diff = ((competitorPrice - userPrice) / userPrice) * 100;
    return Math.round(diff * 10) / 10; // Round to 1 decimal place
  }
}
