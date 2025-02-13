import { Injectable } from '@nestjs/common';
import { Spider } from '@spider-cloud/spider-client';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { JsonUtils } from '@shared/utils';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import type { DiscoveryResult } from '../interfaces/discovery-result.interface';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { AnalysisResult } from '../interfaces/analysis-result.interface';
import { CompetitorAnalysisService } from './competitor-analysis.service';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../env';

@Injectable()
export class CompetitorDiscoveryService {
  private spider: Spider;

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly websiteDiscovery: WebsiteDiscoveryService,
    private readonly analysisService: CompetitorAnalysisService,
    private readonly configService: ConfigService<Env, true>
  ) {
    this.spider = new Spider({ 
      apiKey: this.configService.get('SPIDER_API_KEY')
    });
  }

  async discoverCompetitors(
    domain: string,
    userId: string,
    businessType: string,
    knownCompetitors: string[] = [],
    productCatalogUrl: string,
  ): Promise<DiscoveryResult> {
    try {
      console.info({ domain, userId, productCatalogUrl }, 'Starting competitor discovery');

      // First discover our own website content
      console.log('Discovering website content');
      const websiteContent = await this.websiteDiscovery.discoverWebsiteContent(domain);
      
      // Analyze product catalog URL (required)
      console.log('Analyzing product catalog URL');
      try {
        const catalogContent = await this.websiteDiscovery.discoverWebsiteContent(productCatalogUrl);
        websiteContent.products = [...websiteContent.products, ...catalogContent.products];
      } catch (error) {
        console.error('Failed to analyze product catalog:', error);
        throw new Error('Product catalog analysis failed. Please ensure the URL is valid and accessible.');
      }
      
      console.log({ websiteContent }, 'Website content discovered');

      console.log('Determining search strategy');
      const strategy = await this.analysisService.determineSearchStrategy(domain, businessType, websiteContent);
      console.log({ strategy }, 'Search strategy determined');

      // Get competitors from multiple sources
      const [serpResults, llmCompetitors] = await Promise.all([
        this.fetchValueSerpResults(domain, strategy),
        this.getLLMCompetitors(domain, businessType, knownCompetitors, websiteContent)
      ]);

      console.log({ serpCount: serpResults.length, llmCount: llmCompetitors.length }, 'Received competitor sources');

      const results = [...serpResults];

      // Combine all discovered domains
      const discoveredDomains = [
        ...new Set([
          ...results,
          ...llmCompetitors.map(s => s.trim().toLowerCase()),
          ...knownCompetitors.map(s => s.trim().toLowerCase())
        ])
      ].filter(s => s.length > 0 && s !== domain.toLowerCase());

      console.log({ discoveredDomains }, 'Processing discovered domains');

      console.log(`Starting competitor analysis for ${discoveredDomains.length} domains`);
      let failedAnalyses = 0;
      // Get competitor insights with error handling
      const competitorInsights = await Promise.all(
        discoveredDomains.map(async (competitorDomain) => {
          try {
            const insight = await this.analysisService.analyzeCompetitor(competitorDomain, strategy);
            console.info(`Analysis completed for ${competitorDomain}:`, insight);
            return insight;
          } catch (error) {
            console.error(`Failed to analyze competitor ${competitorDomain}:`, error);
            failedAnalyses++;
            return null;
          }
        })
      );

      // Filter and sort competitors by match score
      const rankedCompetitors = competitorInsights
        .filter((insight): insight is CompetitorInsight => insight !== null)
        .sort((a, b) => b.matchScore - a.matchScore);

      console.info({ rankedCount: rankedCompetitors.length }, 'Competitor ranking completed');

      // Get recommended data sources with error handling
      let recommendedSources: string[] = [];
      try {
        recommendedSources = await this.analysisService.suggestDataSources(strategy);
        console.log('Recommended data sources:', recommendedSources);
      } catch (error) {
        console.error('Failed to get recommended sources:', error);
        recommendedSources = [];
      }

      const finalStats = {
        totalDiscovered: discoveredDomains.length,
        newCompetitors: 0,
        existingCompetitors: 0,
        failedAnalyses
      };

      console.info('Discovery process completed with stats:', finalStats);

      return {
        competitors: rankedCompetitors,
        recommendedSources,
        searchStrategy: strategy,
        stats: finalStats
      };
    } catch (error) {
      console.error('Failed to discover competitors:', error);
      throw new Error('Failed to discover competitors. Please try again later.');
    }
  }

  private async getLLMCompetitors(
    domain: string, 
    businessType: string, 
    knownCompetitors: string[],
    websiteContent: any
  ): Promise<string[]> {
    const prompt = `Analyze ${domain} as a ${businessType} business.
    Known competitors: ${knownCompetitors.join(", ")}
    
    Website Content Analysis:
    Title: ${websiteContent.title}
    Description: ${websiteContent.description}
    Products: ${JSON.stringify(websiteContent.products)}
    Services: ${JSON.stringify(websiteContent.services)}
    
    Consider these business-specific aspects for competitor discovery:
    
    1. For hospitality/lodging:
      - Similar location/destination type
      - Comparable experience offerings
      - Price range and luxury level
      - Target tourist demographic
    
    2. For SaaS/Tech:
      - Similar product feature set
      - Target market segment
      - Pricing model alignment
      - Technology stack/platform
    
    3. For marketplaces:
      - Similar market niche
      - Geographic coverage
      - Commission/pricing models
      - Seller/buyer demographics
    
    4. For e-commerce:
      - Product category overlap
      - Price positioning
      - Market reach
      - Fulfillment capabilities
    
    5. For service businesses:
      - Service category match
      - Geographic coverage
      - Expertise/specialization
      - Client segment
    
    Based on the actual products/services discovered from their website, suggest 3-5 direct competitors 
    that most closely match their specific offerings and target market.
    Consider both direct and indirect competitors based on service/product substitutability.
    
    Return ONLY a JSON array of domain names. Example:
    ["competitor1.com", "competitor2.com"]`;
      
    try {
      const result = await this.modelManager.withBatchProcessing(async (llm) => {
        return await llm.invoke(prompt);
      }, prompt);
      const content = result.content.toString();
      const jsonStr = JsonUtils.extractJSON(content, "array");
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse LLM competitor response:', error);
      return [];
    }
  }

  private async fetchValueSerpResults(domain: string, strategy: AnalysisResult): Promise<string[]> {
    const baseParams = {
      api_key: this.configService.get('VALUESERP_API_KEY'),
      google_domain: "google.com",
      gl: "us",
      hl: "en",
      location: strategy.locationContext?.location?.country || "United States"
    };

    const results: string[] = [];

    // Always fetch maps results first for local competitors if we have location data
    if (strategy.locationContext?.location) {
      const mapsParams = new URLSearchParams({
        ...baseParams,
        q: strategy.searchQuery,
        tbm: "lcl",
        num: "20",
        radius: strategy.locationContext.radius.toString()
      });

      try {
        const mapsResponse = await fetch(`https://api.valueserp.com/maps?${mapsParams}`);
        if (mapsResponse.ok) {
          const mapsData = await mapsResponse.json();
          const localCompetitors = mapsData.local_results?.map((r: any) => ({
            domain: r.website,
            distance: r.distance,
            rating: r.rating,
            reviews: r.reviews,
            address: r.address
          })) || [];

          results.push(...localCompetitors.map((c: any) => c.domain).filter(Boolean));
        }
      } catch (error) {
        console.error("ValueSerp maps fetch failed:", error);
      }
    }

    // Fetch additional results based on search type
    const endpointMap: Record<AnalysisResult['searchType'], {
      path: string;
      params: Record<string, string | number>
    }> = {
      maps: {
        path: "/maps",
        params: {
          q: strategy.searchQuery,
          tbm: "lcl",
          num: 20,
          radius: strategy.locationContext?.radius || 25
        }
      },
      shopping: {
        path: "/shopping",
        params: {
          q: strategy.searchQuery,
          tbm: "shop",
          num: 15
        }
      },
      local: {
        path: "/search",
        params: {
          q: strategy.searchQuery,
          tbm: "lcl",
          num: 15,
          radius: strategy.locationContext?.radius || 50
        }
      },
      organic: {
        path: "/search",
        params: {
          q: strategy.searchQuery,
          num: 20
        }
      }
    };

    if (strategy.searchType !== 'maps') {
      let config = endpointMap[strategy.searchType];
      if (!config) {
        console.warn(`Invalid search type "${strategy.searchType}", using organic search`);
        config = endpointMap.organic;
      }

      const params = new URLSearchParams({
        ...baseParams,
        ...config.params,
        q: strategy.searchQuery
      });

      try {
        const response = await fetch(`https://api.valueserp.com${config.path}?${params}`);
        if (response.ok) {
          const data = await response.json();
          const urls = this.extractUrlsFromResponse(data, strategy.searchType);
          results.push(...urls);
        }
      } catch (error) {
        console.error(`ValueSerp ${strategy.searchType} fetch failed:`, error);
      }
    }

    return [...new Set(results)].filter(Boolean);
  }

  private extractUrlsFromResponse(data: any, searchType: string): string[] {
    const urls: string[] = [];

    switch (searchType) {
      case 'maps':
        (data.local_results || []).forEach((r: any) => {
          if (r.website) urls.push(r.website);
        });
        break;
      
      case 'shopping':
        (data.shopping_results || []).forEach((r: any) => {
          if (r.link) urls.push(new URL(r.link).hostname);
        });
        break;
      
      case 'local':
      case 'organic':
        (data.organic_results || []).forEach((r: any) => {
          if (r.link) urls.push(new URL(r.link).hostname);
        });
        break;
    }

    return urls;
  }
} 