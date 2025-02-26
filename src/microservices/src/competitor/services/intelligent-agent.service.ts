import { Injectable, Logger } from '@nestjs/common';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { AgentToolsService } from './agent-tools.service';
import type { CompetitorInsight } from '../interfaces/competitor-insight.interface';
import type { WebsiteContent } from '../../interfaces/website-content.interface';

@Injectable()
export class IntelligentAgentService {
  private readonly logger = new Logger(IntelligentAgentService.name);

  constructor(
    private readonly modelManager: ModelManagerService,
    private readonly tools: AgentToolsService
  ) {}

  async analyzeCompetitor(
    domain: string,
    businessContext?: any,
    serpMetadata?: {
      title?: string;
      snippet?: string;
      rating?: number;
      reviewCount?: number;
      priceRange?: {
        min: number;
        max: number;
        currency: string;
      };
    }
  ): Promise<CompetitorInsight> {
    console.log(`Starting analysis for domain: ${domain}`);
    
    // Ensure domain has the correct format
    if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
      domain = `https://${domain}`;
    }
    
    // Log business context if provided
    if (businessContext) {
      console.log(`Business context provided: ${JSON.stringify(businessContext)}`);
    }
    
    // Define system prompt
    const systemPrompt = `You are an intelligent agent that can analyze a competitor's website. You have the following tools:
      - search: Search for the competitor's website and other online information
      - web.fetchContent: Fetch the content of a webpage
      - web.extractText: Extract clean text from HTML
      - web.extractStructuredData: Extract structured data from HTML
      - web.extractPricing: Extract pricing information from HTML
      - web.extractMetaTags: Extract meta tags from HTML
      - analysis.compareProducts: Compare similarity between two product descriptions
      - analysis.extractFeatures: Extract key features from text
      - analysis.categorizeOffering: Categorize an offering as product or service
      - navigation.findRelevantPages: Find relevant pages on a website
      - navigation.checkRobotsRules: Check if a URL is allowed by robots.txt

    Follow these steps:
    1. Search for the competitor's website and gather information
    2. Analyze their website content to understand their offerings
    3. Extract products, services, pricing, and other relevant data
    4. Determine their strengths and weaknesses
    5. Assess how they compare to other businesses in their space`;

    try {
      // First, fetch and analyze the website content
      const html = await this.tools.web.fetchContent(domain);
      const websiteText = this.tools.web.extractText(html);
      const metaTags = this.tools.web.extractMetaTags(html);
      const structuredData = this.tools.web.extractStructuredData(html);
      
      // Detect business type
      console.log(`Detecting business type for ${domain}`);
      const businessTypeInfo = await this.tools.analysis.detectBusinessType(websiteText, domain);
      
      // If business context provided, use that business type instead
      if (businessContext?.businessType) {
        businessTypeInfo.businessType = businessContext.businessType;
        console.log(`Using provided business type: ${businessTypeInfo.businessType}`);
      }
      
      console.log(`Detected business type: ${businessTypeInfo.businessType}, ${businessTypeInfo.specificType}`);
      
      // Extract pricing using business-specific approach
      const pricing = await this.tools.analysis.extractPricesForBusinessType(html, businessTypeInfo.businessType);
      console.log(`Extracted ${pricing.length} price points for ${domain}`);
      
      // Use SERP metadata for additional pricing if available
      if (serpMetadata?.priceRange) {
        console.log(`Using SERP pricing data: ${JSON.stringify(serpMetadata.priceRange)}`);
        if (pricing.length === 0) {
          pricing.push({
            value: (serpMetadata.priceRange.min + serpMetadata.priceRange.max) / 2,
            currency: serpMetadata.priceRange.currency,
            unit: 'per item',
            context: 'From search results',
            source: 'serp'
          });
        }
      }
      
      // Find relevant pages to explore
      const relevantPages = await this.tools.navigation.findRelevantPages(domain, html);
      console.log(`Found ${relevantPages.length} relevant pages to explore`);
      
      // Extract and analyze offerings from all relevant pages
      const offerings: Array<{
        type: string;
        category: string;
        features: string[];
        name: string;
        pricing: {
          value: number | null;
          currency: string;
          unit: string;
        };
        sourceUrl: string;
      }> = [];
      const visitedUrls = new Set([domain]);
      
      for (const pageUrl of relevantPages) {
        // Avoid visiting the same URL twice
        if (visitedUrls.has(pageUrl)) continue;
        visitedUrls.add(pageUrl);
        
        // Check robots.txt rules
        const isAllowed = await this.tools.navigation.checkRobotsRules(pageUrl);
        if (!isAllowed) {
          console.log(`Skipping disallowed URL: ${pageUrl}`);
          continue;
        }
        
        try {
          console.log(`Analyzing page: ${pageUrl}`);
          const pageHtml = await this.tools.web.fetchContent(pageUrl);
          const pageText = this.tools.web.extractText(pageHtml);
          
          // Split text into chunks for analysis
          const chunks = this.splitTextIntoChunks(pageText, 500);
          
          for (const chunk of chunks) {
            // Skip very short chunks
            if (chunk.length < 50) continue;
            
            // Categorize the offering with business context
            const categorized = await this.tools.analysis.categorizeOffering(chunk, {
              businessType: businessTypeInfo.businessType,
              offeringNomenclature: businessTypeInfo.extractionStrategy.offeringNomenclature
            });
            
            // Add to offerings if it has a name or category
            if (categorized.name !== 'unknown' || categorized.category !== 'unknown') {
              offerings.push({
                ...categorized,
                sourceUrl: pageUrl
              });
            }
          }
        } catch (error) {
          console.error(`Error analyzing page ${pageUrl}:`, error);
        }
      }
      
      console.log(`Extracted ${offerings.length} offerings from ${domain}`);
      
      // Merge similar offerings and deduplicate
      const uniqueOfferings = this.deduplicateOfferings(offerings);
      console.log(`After deduplication: ${uniqueOfferings.length} unique offerings`);
      
      // Format offerings into CompetitorInsight products format
      const products = uniqueOfferings.map(offering => {
        const matchedProduct = businessContext?.userProducts?.find((p: any) => 
          p.name.toLowerCase().includes(offering.name.toLowerCase()) || 
          offering.name.toLowerCase().includes(p.name.toLowerCase())
        );
        
        return {
          name: offering.name || offering.category,
          url: offering.sourceUrl || domain,
          price: offering.pricing?.value || null,
          currency: offering.pricing?.currency || 'USD',
          matchedProducts: [{
            name: matchedProduct?.name || offering.name || offering.category,
            url: offering.sourceUrl || '',
            matchScore: matchedProduct ? 80 : 0,  // Higher score if matched with user product
            priceDiff: matchedProduct?.price ? 
              ((offering.pricing?.value || 0) - matchedProduct.price) : null
          }],
          lastUpdated: new Date().toISOString()
        };
      });
      
      // Generate listing platforms based on structured data and external sources
      const listingPlatforms = this.extractListingPlatforms(structuredData, domain);
      
      // Calculate match score based on business context
      let matchScore = 60; // Default score
      
      if (businessContext) {
        // Increase score if business types match
        if (businessContext.businessType && 
            businessContext.businessType.toLowerCase() === businessTypeInfo.businessType.toLowerCase()) {
          matchScore += 15;
        }
        
        // Increase score if product matches found
        const productMatchCount = products.filter(p => p.matchedProducts[0].matchScore > 0).length;
        if (productMatchCount > 0) {
          matchScore += Math.min(25, productMatchCount * 5); // Up to 25 points for product matches
        }
      }
      
      // Prepare the final competitor insight
      const insight: CompetitorInsight = {
        domain: this.extractDomainName(domain),
        matchScore: Math.min(100, matchScore), // Cap at 100
        matchReasons: [
          `${businessTypeInfo.businessType} business`,
          `offering ${businessTypeInfo.specificType || 'products/services'}`
        ],
        suggestedApproach: "Analyze pricing strategy and unique selling points",
        dataGaps: [],
        listingPlatforms,
        products
      };
      
      // Identify data gaps
      if (!metaTags.description) insight.dataGaps.push("missing meta description");
      if (structuredData.length === 0) insight.dataGaps.push("lack of structured data");
      if (pricing.length === 0) insight.dataGaps.push("missing pricing information");
      if (products.length === 0) insight.dataGaps.push("no clearly identified products/services");
      
      console.log(`Completed analysis for ${domain}`);
      return insight;
    } catch (error) {
      console.error(`Failed to analyze competitor ${domain}:`, error);
      throw error;
    }
  }
  
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }
  
  private deduplicateOfferings(offerings: any[]): any[] {
    const result: any[] = [];
    const nameMap = new Map<string, number>();
    
    for (const offering of offerings) {
      const key = offering.name.toLowerCase();
      
      if (nameMap.has(key)) {
        // Merge with existing offering
        const existingIndex = nameMap.get(key)!;
        const existing = result[existingIndex];
        
        // Keep the offering with more details
        if (offering.pricing?.value && !existing.pricing?.value) {
          existing.pricing = offering.pricing;
        }
        
        // Merge features
        if (Array.isArray(offering.features) && offering.features.length > 0) {
          existing.features = [...new Set([...existing.features, ...offering.features])];
        }
      } else {
        // Add as new offering
        nameMap.set(key, result.length);
        result.push(offering);
      }
    }
    
    return result;
  }
  
  private extractListingPlatforms(structuredData: any[], domain: string): any[] {
    const platforms: Array<{
      platform: string;
      url: string;
      rating: number | null;
      reviewCount: number | null;
      priceRange: any;
    }> = [];
    
    // Look for external references in structured data
    const sameName = this.extractDomainName(domain);
    
    // Common platforms to check for
    const commonPlatforms = [
      { name: 'Booking.com', pattern: 'booking.com' },
      { name: 'Expedia', pattern: 'expedia' },
      { name: 'TripAdvisor', pattern: 'tripadvisor' },
      { name: 'Hotels.com', pattern: 'hotels.com' },
      { name: 'Airbnb', pattern: 'airbnb' },
      { name: 'Agoda', pattern: 'agoda' },
      { name: 'Yelp', pattern: 'yelp' },
      { name: 'Google', pattern: 'google.com/travel' },
    ];
    
    // Extract from structured data
    for (const data of structuredData) {
      if (data.sameAs && Array.isArray(data.sameAs)) {
        for (const url of data.sameAs) {
          for (const platform of commonPlatforms) {
            if (url.includes(platform.pattern)) {
              platforms.push({
                platform: platform.name,
                url,
                rating: data.aggregateRating?.ratingValue || null,
                reviewCount: data.aggregateRating?.reviewCount || null,
                priceRange: null
              });
              break;
            }
          }
        }
      }
    }
    
    return platforms;
  }
  
  private extractDomainName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch (e) {
      return url.replace(/^www\./, '').split('/')[0];
    }
  }

  async discoverCompetitors(
    domain: string,
    businessType: string,
    userProducts: Array<{ name: string; description: string; price: number; currency: string }>
  ): Promise<CompetitorInsight[]> {
    this.logger.log(`Starting competitor discovery for ${domain}`);

    try {
      // Step 1: Analyze the user's business
      // Ensure domain has proper format
      const mainUrl = domain.startsWith('http://') || domain.startsWith('https://') 
        ? domain 
        : `https://${domain}`;
        
      const html = await this.tools.web.fetchContent(mainUrl);
      const businessText = this.tools.web.extractText(html);
      const businessFeatures = await this.tools.analysis.extractFeatures(businessText);

      // Step 2: Generate search queries
      const searchPrompt = `Based on this business information, generate optimal search queries to find competitors:
      Business Type: ${businessType}
      Features: ${JSON.stringify(businessFeatures)}
      Products: ${JSON.stringify(userProducts)}

      Return ONLY a JSON array of search queries optimized for different search types (shopping, local, organic).`;

      const result = await this.modelManager.withBatchProcessing(
        async (llm) => llm.invoke(searchPrompt),
        searchPrompt
      );

      let searchQueries;
      try {
        // Try to parse the response directly
        const responseContent = result.content.toString();
        
        try {
          searchQueries = JSON.parse(responseContent);
        } catch (parseError) {
          // If direct parsing fails, try to extract JSON array using regex
          const jsonMatch = /\[[\s\S]*\]/.exec(responseContent);
          if (!jsonMatch) {
            // If no JSON array found, use a default query
            this.logger.warn(`Failed to extract search queries from LLM response: ${parseError.message}`);
            searchQueries = [`competitors for ${businessType}`, domain];
          } else {
            try {
              searchQueries = JSON.parse(jsonMatch[0]);
            } catch (secondParseError) {
              this.logger.warn(`Failed to parse extracted JSON array: ${secondParseError.message}`);
              searchQueries = [`competitors for ${businessType}`, domain];
            }
          }
        }
        
        // Ensure we have a valid array
        if (!Array.isArray(searchQueries) || searchQueries.length === 0) {
          searchQueries = [`competitors for ${businessType}`, domain];
        }
      } catch (error) {
        this.logger.error(`Error processing search queries: ${error.message}`);
        searchQueries = [`competitors for ${businessType}`, domain];
      }

      // Step 3: Execute searches with different strategies
      const searchTypes: Array<'shopping' | 'maps' | 'local' | 'organic'> = 
        ['shopping', 'organic', businessType.includes('local') ? 'local' : 'maps'];

      const searchResults = await Promise.all(
        searchTypes.flatMap(type =>
          searchQueries.map(query =>
            this.tools.search.serpSearch(query, type)
          )
        )
      );

      // Step 4: Extract unique competitor domains
      const competitors = new Set<string>();
      searchResults.flat().forEach(result => {
        if (result.url && result.url !== domain) {
          competitors.add(result.url);
        }
      });

      // Step 5: Analyze each competitor
      const insights = await Promise.all(
        Array.from(competitors).map(competitorDomain => {
          const competitorBusinessContext = {
            ...businessType && { businessType },
            userProducts
          };
          
          return this.analyzeCompetitor(competitorDomain, competitorBusinessContext)
            .catch(error => {
              this.logger.warn(`Failed to analyze ${competitorDomain}:`, error);
              return null;
            });
        })
      );

      return insights.filter((insight): insight is CompetitorInsight => insight !== null);

    } catch (error) {
      this.logger.error(`Failed to discover competitors for ${domain}:`, error);
      throw error;
    }
  }
} 