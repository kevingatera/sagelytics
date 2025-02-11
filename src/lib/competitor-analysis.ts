import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { ModelManager } from "./llm/model-manager";
import type { WebsiteContent } from "./website-discovery";
import { extractJSON } from "~/lib/json-utils";

const productMatchSchema = z.object({
  name: z.string(),
  url: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  matchedProducts: z.array(z.object({
    name: z.string(),
    url: z.string().nullable(),
    matchScore: z.number(),
    priceDiff: z.number().nullable()
  })),
  lastUpdated: z.string()
});

const serviceTypeSchema = z.enum(["product", "service", "hybrid"]);

const BusinessAttributesSchema = z.object({
  size: z.enum(['small', 'medium', 'large']),
  focus: z.array(z.string()),
  onlinePresence: z.enum(['weak', 'moderate', 'strong']),
  businessCategory: z.string(),
  serviceType: serviceTypeSchema,
  uniqueFeatures: z.array(z.string())
});

const analysisResultSchema = z.object({
  searchType: z.enum(['maps', 'shopping', 'local', 'organic']),
  searchQuery: z.string(),
  locationContext: z.object({
    location: z.object({
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      country: z.string(),
      region: z.string(),
      city: z.string(),
      postalCode: z.string().optional(),
      formattedAddress: z.string()
    }),
    radius: z.number(),
    timezone: z.string().optional()
  }).nullable().optional(),
  targetDemographic: z.string().optional(),
  priceRange: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string()
  }).optional(),
  businessAttributes: BusinessAttributesSchema.optional()
});

const competitorInsightSchema = z.object({
  domain: z.string(),
  matchScore: z.number(),
  matchReasons: z.array(z.string()),
  suggestedApproach: z.string(),
  dataGaps: z.array(z.string()),
  listingPlatforms: z.array(z.object({
    platform: z.string(),
    url: z.string(),
    rating: z.number().nullable(),
    reviewCount: z.number().nullable(),
    priceRange: z.object({
      min: z.number(),
      max: z.number(),
      currency: z.string()
    }).nullable()
  })),
  products: z.array(productMatchSchema)
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type CompetitorInsight = z.infer<typeof competitorInsightSchema>;
export type ProductMatch = z.infer<typeof productMatchSchema>;

interface ProductInfo {
  name: string;
  price: number | null;
}

export class CompetitorAnalysisAgent {
  private modelManager: ModelManager;

  constructor() {
    this.modelManager = new ModelManager();
  }

  private parseJsonResponse<T>(content: string, schema: z.ZodType<T>): T {
    const jsonStr = extractJSON(content, "object");
    return schema.parse(JSON.parse(jsonStr));
  }

  async determineSearchStrategy(
    domain: string, 
    businessType: string,
    websiteContent: WebsiteContent
  ): Promise<AnalysisResult> {
    const prompt = `Analyze ${domain} as a ${businessType} business. Create a comprehensive search strategy.
    
    Website Content Analysis:
    Title: ${websiteContent.title}
    Description: ${websiteContent.description}
    Products: ${JSON.stringify(websiteContent.products)}
    Services: ${JSON.stringify(websiteContent.services)}
    
    Consider these business-specific aspects:
    1. For hospitality/lodging (like gorilla lodges):
      - Focus on location-based services
      - Room types and pricing
      - Unique experiences/amenities
    2. For SaaS/Tech companies:
      - Product features and capabilities
      - Pricing tiers
      - Integration possibilities
    3. For marketplaces:
      - Seller/buyer dynamics
      - Commission structures
      - Platform features
    4. For e-commerce:
      - Product catalogs
      - Shipping options
      - Customer service
    
    Return ONLY a JSON object with these fields:
    {
      "searchType": one of ["maps", "shopping", "local", "organic"],
      "searchQuery": "optimized search terms",
      "locationContext": {
        "location": {
          "address": "full address",
          "latitude": number,
          "longitude": number,
          "country": "country name",
          "region": "state/province",
          "city": "city name",
          "postalCode": "postal code",
          "formattedAddress": "formatted address"
        },
        "radius": number (in km),
        "timezone": "timezone string"
      },
      "targetDemographic": "primary customer segment",
      "priceRange": {
        "min": number,
        "max": number,
        "currency": "USD"
      },
      "businessAttributes": {
        "size": one of ["small", "medium", "large"],
        "focus": ["area1", "area2"],
        "onlinePresence": one of ["weak", "moderate", "strong"],
        "businessCategory": "category name",
        "serviceType": one of ["product", "service", "hybrid"],
        "uniqueFeatures": ["feature1", "feature2"]
      }
    }`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    return this.parseJsonResponse(result.content.toString(), analysisResultSchema);
  }

  async analyzeCompetitor(competitorDomain: string, businessContext: AnalysisResult): Promise<CompetitorInsight> {
    const prompt = `Analyze ${competitorDomain} as a potential competitor.

    Business Context:
    ${JSON.stringify(businessContext, null, 2)}

    Return ONLY a JSON object with this structure:
    {
      "name": "Competitor Name",
      "domain": "${competitorDomain}",
      "competitiveAdvantages": ["advantage1", "advantage2"],
      "weaknesses": ["weakness1", "weakness2"],
      "marketShare": {
        "percentage": number,
        "confidence": number
      },
      "targetMarket": {
        "demographics": ["demographic1", "demographic2"],
        "geographicFocus": ["location1", "location2"],
        "businessSize": "small/medium/large"
      },
      "productOverlap": {
        "percentage": number,
        "categories": ["category1", "category2"]
      },
      "pricingStrategy": {
        "positioning": "budget/mid-market/premium",
        "model": "subscription/one-time/freemium/etc",
        "comparison": "higher/lower/similar"
      },
      "onlinePresence": {
        "website": {
          "quality": number,
          "features": ["feature1", "feature2"]
        },
        "socialMedia": {
          "platforms": ["platform1", "platform2"],
          "engagement": "high/medium/low"
        }
      },
      "lastUpdated": "2024-03-20"
    }`;

    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);

    return this.parseJsonResponse(result.content.toString(), competitorInsightSchema);
  }

  async analyzeProductMatches(
    ourProducts: Array<{ name: string; url: string; price: number }>,
    competitorProducts: Array<{ name: string; url: string; price: number | null }>
  ): Promise<ProductMatch[]> {
    const prompt = `Compare these products and find matches:
    Our Products: ${JSON.stringify(ourProducts, null, 2)}
    Competitor Products: ${JSON.stringify(competitorProducts, null, 2)}
    
    Return ONLY a JSON array of product matches with these fields:
    [
      {
        "name": "Product Name",
        "url": "Product URL",
        "price": number or null,
        "currency": "USD",
        "matchedProducts": [
          {
            "name": "Matched Product Name",
            "url": "Matched Product URL",
            "matchScore": number between 0-100,
            "priceDiff": number or null
          }
        ],
        "lastUpdated": "current ISO date"
      }
    ]`;
    
    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);
    const content = result.content.toString();
    const jsonStr = extractJSON(content, "array");
    return z.array(productMatchSchema).parse(JSON.parse(jsonStr));
  }

  async suggestDataSources(businessContext: AnalysisResult): Promise<string[]> {
    const prompt = `Based on this business context:
    ${JSON.stringify(businessContext, null, 2)}
    
    Return ONLY a JSON array of data source names. Example:
    ["source1", "source2", "source3"]`;
    
    const result = await this.modelManager.withBatchProcessing(async (llm) => {
      return await llm.invoke(prompt);
    }, prompt);
    const content = result.content.toString();
    let jsonStr: string;
    try {
      jsonStr = extractJSON(content, "array");
    } catch {
      jsonStr = "[]";
    }
    const parsed = z.array(z.string()).safeParse(JSON.parse(jsonStr));
    return parsed.success ? parsed.data : [];
  }

  private async calculateMatchScore(
    ourProduct: ProductInfo,
    theirProduct: ProductInfo
  ): Promise<number> {
    if (!ourProduct.name || !theirProduct.name) return 0;

    const nameSimilarity = this.calculateStringSimilarity(
      ourProduct.name.toLowerCase(),
      theirProduct.name.toLowerCase()
    );
    
    let priceSimilarity = 0;
    if (typeof ourProduct.price === 'number' && typeof theirProduct.price === 'number') {
      const priceDiff = Math.abs(ourProduct.price - theirProduct.price);
      const maxPrice = Math.max(ourProduct.price, theirProduct.price);
      priceSimilarity = maxPrice > 0 ? 100 - (priceDiff / maxPrice * 100) : 0;
    }

    const weightedScore = priceSimilarity > 0 
      ? (nameSimilarity * 0.7) + (priceSimilarity * 0.3)
      : nameSimilarity;

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 100;
    
    const costs: number[] = Array.from({ length: shorter.length + 1 }, () => 0);
    
    for (let i = 0; i <= longer.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= shorter.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          const prevCost = costs[j - 1] ?? 0;
          const currentCost = costs[j] ?? 0;
          let newValue = prevCost;
          if (longer[i - 1] !== shorter[j - 1]) {
            newValue = Math.min(prevCost, lastValue, currentCost) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[shorter.length] = lastValue;
      }
    }
    
    const finalCost = costs[shorter.length] ?? 0;
    return Math.round(100 * (1 - (finalCost / longer.length)));
  }
} 