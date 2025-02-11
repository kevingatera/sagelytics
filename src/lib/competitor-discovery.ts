import { ChatGroq } from "@langchain/groq";
import { db } from "~/server/db";
import { competitors, userCompetitors, type PlatformData, type CompetitorMetadata } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { CompetitorAnalysisAgent } from "./competitor-analysis";
import { env } from "~/env";
import type { AnalysisResult, CompetitorInsight } from "./competitor-analysis";
import { ModelManager } from "./llm/model-manager";
import { WebsiteDiscoveryService, type WebsiteContent } from "./website-discovery";
import { z } from "zod";
import { extractJSON } from "~/lib/json-utils";

export type DiscoveryResult = {
  competitors: CompetitorInsight[];
  recommendedSources: string[];
  searchStrategy: AnalysisResult;
  stats: {
    totalDiscovered: number;
    newCompetitors: number;
    existingCompetitors: number;
    failedAnalyses: number;
  };
};

export async function discoverCompetitors(
  domain: string,
  userId: string,
  businessType: string,
  knownCompetitors: string[] = [],
  productCatalogUrl: string
): Promise<DiscoveryResult> {
  try {
    console.info({ domain, userId, productCatalogUrl }, 'Starting competitor discovery')
    const analysisAgent = new CompetitorAnalysisAgent();
    const websiteDiscovery = new WebsiteDiscoveryService();

    // First discover our own website content
    console.log('Discovering website content')
    const websiteContent = await websiteDiscovery.discoverWebsiteContent(domain);
    
    // Analyze product catalog URL (required)
    console.log('Analyzing product catalog URL')
    try {
      const catalogContent = await websiteDiscovery.discoverWebsiteContent(productCatalogUrl);
      websiteContent.products = [...websiteContent.products, ...catalogContent.products];
    } catch (error) {
      console.error('Failed to analyze product catalog:', error);
      throw new Error('Product catalog analysis failed. Please ensure the URL is valid and accessible.');
    }
    
    console.log({ websiteContent }, 'Website content discovered')

    console.log('Determining search strategy')
    const strategy = await analysisAgent.determineSearchStrategy(domain, businessType, websiteContent);
    console.log({ strategy }, 'Search strategy determined')

    // Get competitors from multiple sources
    const [serpResults, llmCompetitors] = await Promise.all([
      fetchValueSerpResults(domain, strategy),
      getLLMCompetitors(domain, businessType, knownCompetitors, websiteContent)
    ]);

    console.log({ serpCount: serpResults.length, llmCount: llmCompetitors.length }, 'Received competitor sources')

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
          const insight = await analysisAgent.analyzeCompetitor(competitorDomain, strategy);
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
      const sourcesResponse = await analysisAgent.suggestDataSources(strategy);
      console.log('Raw data sources response:', sourcesResponse);
      recommendedSources = Array.isArray(sourcesResponse) ? sourcesResponse : [];
    } catch (error) {
      console.error('Failed to get recommended sources:', error);
      recommendedSources = [];
    }

    let newCompetitors = 0;
    let existingCompetitors = 0;

    // Insert competitors and create relationships with strength based on match score
    for (const insight of rankedCompetitors) {
      try {
        console.info(`Processing competitor ${insight.domain}`);

        // Analyze platform presence
        const platformData = await analyzePlatformPresence(insight.domain);

        // Update competitor metadata to include platform data
        const metadata: CompetitorMetadata = {
          matchScore: insight.matchScore,
          matchReasons: insight.matchReasons,
          suggestedApproach: insight.suggestedApproach,
          dataGaps: insight.dataGaps,
          lastAnalyzed: new Date().toISOString(),
          platforms: platformData,
          products: insight.products?.map(p => ({
            name: p.name,
            url: p.url ?? '',
            price: p.price ?? 0,
            currency: p.currency ?? 'USD',
            platform: 'unknown',
            matchedProducts: Array.isArray(p.matchedProducts)
              ? p.matchedProducts.map(m => m.name)
              : [],
            lastUpdated: p.lastUpdated
          })) ?? []
        };

        let competitor = await db.query.competitors.findFirst({
          where: eq(competitors.domain, insight.domain)
        });

        if (!competitor) {
          console.info(`Creating new competitor: ${insight.domain}`);
          const [newCompetitor] = await db
            .insert(competitors)
            .values({
              domain: insight.domain,
              metadata
            })
            .returning();
          competitor = newCompetitor;
          console.info(`Successfully created competitor: ${insight.domain}`, newCompetitor);
          newCompetitors++;
        } else {
          existingCompetitors++;
          console.info(`Updating existing competitor: ${insight.domain}`);
          await db
            .update(competitors)
            .set({
              metadata: {
                ...competitor.metadata,
                ...metadata
              }
            })
            .where(eq(competitors.id, competitor.id));
          console.info(`Successfully updated competitor: ${insight.domain}`);
        }

        // Upsert user-competitor relationship
        if (competitor?.id) {
          console.info(`Creating/updating user-competitor relationship for: ${insight.domain}`);
          await db
            .insert(userCompetitors)
            .values({
              userId,
              competitorId: competitor.id,
              relationshipStrength: Math.ceil(insight.matchScore / 20) // Convert 0-100 score to 1-5 scale
            })
            .onConflictDoUpdate({
              target: [userCompetitors.userId, userCompetitors.competitorId],
              set: {
                relationshipStrength: Math.ceil(insight.matchScore / 20)
              }
            });
          console.info(`Successfully created/updated relationship for: ${insight.domain}`);
        }
      } catch (error) {
        console.error(`Failed to insert/update competitor ${insight.domain}:`, error);
      }
    }

    const finalStats = {
      totalDiscovered: discoveredDomains.length,
      newCompetitors,
      existingCompetitors,
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

async function getLLMCompetitors(
  domain: string, 
  businessType: string, 
  knownCompetitors: string[],
  websiteContent: WebsiteContent
): Promise<string[]> {
  const modelManager = new ModelManager();
  const competitors = Array.isArray(knownCompetitors) ? knownCompetitors : [];
  const prompt = `Analyze ${domain} as a ${businessType} business.
  Known competitors: ${competitors.join(", ")}
  
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
    const result = await modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);
    const content = result.content.toString();
    const jsonStr = extractJSON(content, "array");
    const parsed = z.array(z.string()).safeParse(JSON.parse(jsonStr));
    return parsed.success ? parsed.data : [];
  } catch (error) {
    console.error('Failed to parse LLM competitor response:', error);
    return [];
  }
}

async function analyzePlatformPresence(domain: string): Promise<PlatformData[]> {
  const modelManager = new ModelManager();
  const platforms = ['amazon', 'ebay', 'walmart', 'shopify', 'etsy'];

  const prompt = `Analyze ${domain}'s presence on major e-commerce platforms.
  For each platform, determine:
  - If they have a store/presence
  - Store URL if available
  - Approximate sales metrics
  - Review count and rating if available
  - Price range of products
  
  Return ONLY a JSON array of platform data. Example:
  [
    {
      "platform": "amazon",
      "url": "https://amazon.com/stores/example",
      "metrics": {
        "sales": 1000,
        "reviews": 500,
        "rating": 4.5,
        "priceRange": {"min": 10, "max": 100, "currency": "USD"},
        "lastUpdated": "2024-03-20"
      }
    }
  ]`;
  try {
    const result = await modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);
    const content = result.content.toString();
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const cleanedJsonStr = jsonStr.replace(/\bN\/A\b/g, "null");
    return JSON.parse(cleanedJsonStr);
  } catch (error) {
    console.error('Failed to analyze platform presence:', error);
    return [];
  }
}

async function fetchValueSerpResults(domain: string, strategy: AnalysisResult) {
  const baseParams = {
    api_key: env.VALUESERP_API_KEY!,
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
      radius: "25" // 25 mile radius for local results
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
        num: 20
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
        radius: 50
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
    const config = endpointMap[strategy.searchType];
    const params = new URLSearchParams({ ...baseParams, ...config.params });

    try {
      const response = await fetch(`https://api.valueserp.com${config.path}?${params}`);
      if (response.ok) {
        const data = await response.json();
        const additionalResults = await extractCompetitorsFromResponse(data, strategy.searchType);
        results.push(...additionalResults.map(r => r.domain));
      }
    } catch (error) {
      console.error(`ValueSerp ${strategy.searchType} fetch failed:`, error);
    }
  }

  return [...new Set(results)].filter(Boolean);
}

// Add type for extracted competitor data
type ExtractedCompetitorData = {
  domain: string;
  url: string;
  title: string;
  description: string;
  products: Array<{
    name: string;
    price: number | null;
    currency: string;
    url: string | null;
    description: string | null;
  }>;
  services: Array<{
    name: string;
    price: number | null;
    currency: string;
    url: string | null;
    description: string | null;
  }>;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  } | null;
  businessType: string | null;
  confidence: number;
  sourceType: "competitor" | "listing";
  listingInfo?: {
    platform: string;
    rating: number | null;
    reviewCount: number | null;
    categories: string[];
  };
};

async function extractCompetitorsFromResponse(data: any, searchType: string): Promise<ExtractedCompetitorData[]> {
  try {
    const websiteDiscovery = new WebsiteDiscoveryService();
    const modelManager = new ModelManager();

    const analyzePageContent = async (url: string): Promise<ExtractedCompetitorData[]> => {
      try {
        // First discover the page content
        const content = await websiteDiscovery.discoverWebsiteContent(url);
        
        // Use LLM to analyze if this is a listing page or competitor and extract structured data
        const prompt = `Analyze this webpage content and determine if it's a competitor's website or a listing/directory page.
        
        Website Content:
        Title: ${content.title}
        Description: ${content.description}
        Products: ${JSON.stringify(content.products)}
        Services: ${JSON.stringify(content.services)}
        Metadata: ${JSON.stringify(content.metadata)}
        
        If this is a listing/directory page, extract all competitor information mentioned.
        If this is a competitor's own website, analyze their offerings and pricing.
        
        Return ONLY a JSON object with this structure:
        {
          "type": "competitor" | "listing",
          "confidence": number between 0-100,
          "competitors": [
            {
              "domain": "domain.com",
              "url": "full url",
              "title": "business title",
              "description": "business description",
              "products": [
                {
                  "name": "product name",
                  "price": number or null,
                  "currency": "USD",
                  "url": "product url or null",
                  "description": "product description or null"
                }
              ],
              "services": [
                {
                  "name": "service name",
                  "price": number or null,
                  "currency": "USD",
                  "url": "service url or null",
                  "description": "service description or null"
                }
              ],
              "priceRange": {
                "min": number,
                "max": number,
                "currency": "USD"
              },
              "businessType": "business category/type",
              "listingInfo": {
                "platform": "platform name if from listing",
                "rating": number or null,
                "reviewCount": number or null,
                "categories": ["category1", "category2"]
              }
            }
          ]
        }`;

        const llmResult = await modelManager.withBatchProcessing(async (llm) => {
          return await llm.invoke(prompt);
        }, prompt);

        // Extract JSON from the response
        const responseText = llmResult.content.toString();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn('No JSON object found in response');
          return [];
        }

        try {
          const analysis = JSON.parse(jsonMatch[0]);
          
          if (analysis.type === "competitor" && analysis.confidence > 70) {
            // Return single competitor data
            return [{
              domain: new URL(url).hostname,
              url,
              title: content.title,
              description: content.description,
              products: content.products,
              services: content.services,
              priceRange: calculatePriceRange([...content.products, ...content.services]),
              businessType: content.metadata.businessType || null,
              confidence: analysis.confidence,
              sourceType: "competitor"
            }];
          } else if (analysis.type === "listing" && analysis.competitors?.length > 0) {
            // Return all competitors found in listing
            return analysis.competitors.map((comp: any) => ({
              ...comp,
              confidence: analysis.confidence,
              sourceType: "listing"
            }));
          }
        } catch (error) {
          console.error(`Failed to parse LLM response for ${url}:`, error);
          console.debug('Raw response:', responseText);
        }
        
        return [];
      } catch (error) {
        console.error(`Failed to analyze page ${url}:`, error);
        return [];
      }
    };

    const calculatePriceRange = (items: Array<{ price: number | null; currency: string }>) => {
      const prices = items
        .map(item => item.price)
        .filter((price): price is number => price !== null);
      
      if (prices.length === 0) return null;
      
      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        currency: items[0]?.currency || 'USD' // Fallback to USD if no currency is available
      };
    };

    switch (searchType) {
      case 'maps':
        return (await Promise.all(
          (data.local_results || [])
            .map(async (r: any) => {
              const website = r.website || r.businessUrl || r.url;
              if (!website) return [];
              const competitors = await analyzePageContent(website);
              // Enhance with maps-specific data
              return competitors.map(comp => ({
                ...comp,
                listingInfo: {
                  ...(comp.listingInfo || {}),
                  platform: 'Google Maps',
                  rating: r.rating || null,
                  reviewCount: r.reviews || null,
                  categories: r.categories || []
                }
              }));
            })
        )).flat();
      
      case 'shopping':
        return (await Promise.all(
          (data.shopping_results || [])
            .map(async (r: any) => {
              const link = r.link || r.product_link || r.seller_link;
              if (!link) return [];
              const competitors = await analyzePageContent(link);
              // Enhance with shopping-specific data
              return competitors.map(comp => ({
                ...comp,
                products: [
                  ...comp.products,
                  {
                    name: r.title || r.product_title || '',
                    price: r.price ? parseFloat(r.price.replace(/[^0-9.]/g, '')) : null,
                    currency: r.currency || 'USD',
                    url: r.link || null,
                    description: r.snippet || null
                  }
                ].filter(p => p.name)
              }));
            })
        )).flat();
      
      case 'local':
      case 'organic':
        return (await Promise.all(
          (data.organic_results || [])
            .map(async (r: any) => {
              const link = r.link || r.business_url || r.website;
              if (!link) return [];
              const competitors = await analyzePageContent(link);
              // Enhance with organic search data
              return competitors.map(comp => ({
                ...comp,
                description: comp.description || r.snippet || ''
              }));
            })
        )).flat();
      
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error extracting competitors for ${searchType}:`, error);
    return [];
  }
}

// Add type for country mapping
type CountryMapping = {
  [key: string]: string;
};

// Update getCountryFromLocation with proper typing
function getCountryFromLocation(location: string): string | null {
  const countryMap: CountryMapping = {
    'United States': 'US',
    'United Kingdom': 'UK',
    'Canada': 'CA',
    'Australia': 'AU',
    'New Zealand': 'NZ',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Japan': 'JP'
  };
  
  return countryMap[location] || null;
}
