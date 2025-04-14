import { Test, TestingModule } from '@nestjs/testing';
import { CompetitorService } from '../../competitor/competitor.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IntelligentAgentService } from '../../competitor/services/intelligent-agent.service';
import { WebsiteDiscoveryService } from '../../website/services/website-discovery.service';
import {
  DiscoveryResult,
  WebsiteContent,
  CompetitorInsight,
  Product,
} from '@shared/types';
import { validateEnv } from '../../env';
import { ModelManagerService } from '@shared/services/model-manager.service';
import { Logger } from '@nestjs/common';

// Revert to simple mock class definitions
class MockIntelligentAgentService {
  discoverCompetitors = jest.fn();
  analyzeCompetitor = jest.fn();
}

class MockWebsiteDiscoveryService {
  discoverWebsiteContent = jest.fn();
}

class MockModelManagerService {
  getLLM = jest.fn();
  withBatchProcessing = jest.fn();
}

describe('Competitor Discovery Integration Tests', () => {
  let competitorService: CompetitorService;
  // Keep these typed to the actual mock classes
  let mockIntelligentAgentService: MockIntelligentAgentService;
  let mockWebsiteDiscoveryService: MockWebsiteDiscoveryService;

  const testDomain = 'https://lebambougorillalodge.com/';
  const testUserId = 'ad566950-1117-40b5-9bd4-6fc2bf08e60d';
  const testBusinessType = 'ecommerce';
  const testProductCatalogUrl = 'https://lebambougorillalodge.com/stay#Rooms';
  const testKnownCompetitors = ['https://competitor1.com'];

  // Minimal valid WebsiteContent for fallback
  const emptyWebsiteContent: WebsiteContent = {
    url: '',
    title: '',
    description: '',
    products: [],
    services: [],
    categories: [],
    keywords: [],
    mainContent: '',
  };

  const mockWebsiteContent: WebsiteContent = {
    ...emptyWebsiteContent,
    url: testDomain,
    title: 'Le Bambou Gorilla Lodge',
    description: 'Luxury gorilla lodge in Rwanda',
    products: [
      {
        name: 'Standard Room',
        description: 'Comfortable standard room with mountain view',
        price: 200,
        currency: 'USD',
        url: 'https://lebambougorillalodge.com/stay#standard-room',
      },
      {
        name: 'Deluxe Suite',
        description: 'Spacious deluxe suite with private balcony',
        price: 350,
        currency: 'USD',
        url: 'https://lebambougorillalodge.com/stay#deluxe-suite',
      },
    ],
  };

  const mockCatalogContent: WebsiteContent = {
    ...emptyWebsiteContent,
    url: testProductCatalogUrl,
    title: 'Rooms - Le Bambou Gorilla Lodge',
    description: 'Our accommodations',
    products: [
      {
        name: 'Family Suite',
        description: 'Large suite for families with king bed and two singles',
        price: 450,
        currency: 'USD',
        url: 'https://lebambougorillalodge.com/stay#family-suite',
      },
    ],
  };

  const mockCompetitorInsight: CompetitorInsight = {
    domain: 'competitor1.com',
    matchScore: 80,
    matchReasons: ['Similar business model', 'Similar pricing'],
    suggestedApproach: 'Analyze pricing strategy',
    dataGaps: [],
    listingPlatforms: [],
    products: [
      {
        name: 'Standard Room',
        url: null,
        price: 180,
        currency: 'USD',
        matchedProducts: [
          {
            name: 'Standard Room',
            url: null,
            matchScore: 85,
            priceDiff: -20,
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
      {
        name: 'Deluxe Suite',
        url: null,
        price: 320,
        currency: 'USD',
        matchedProducts: [
          {
            name: 'Deluxe Suite',
            url: null,
            matchScore: 90,
            priceDiff: -30,
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
    ],
  };

  const mockDiscoveredCompetitors: CompetitorInsight[] = [
    {
      domain: 'discoveredcompetitor1.com',
      matchScore: 75,
      matchReasons: ['Similar business model'],
      suggestedApproach: 'Analyze marketing strategy',
      dataGaps: [],
      listingPlatforms: [],
      products: [
        {
          name: 'Luxury Room',
          url: null,
          price: 220,
          currency: 'USD',
          matchedProducts: [
            {
              name: 'Standard Room',
              url: null,
              matchScore: 70,
              priceDiff: 20,
            },
          ],
          lastUpdated: new Date().toISOString(),
        },
      ],
    },
    {
      domain: 'discoveredcompetitor2.com',
      matchScore: 70,
      matchReasons: ['Similar business model'],
      suggestedApproach: 'Analyze customer service',
      dataGaps: [],
      listingPlatforms: [],
      products: [
        {
          name: 'Premium Suite',
          url: null,
          price: 400,
          currency: 'USD',
          matchedProducts: [
            {
              name: 'Deluxe Suite',
              url: null,
              matchScore: 65,
              priceDiff: 50,
            },
          ],
          lastUpdated: new Date().toISOString(),
        },
      ],
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          validate: validateEnv,
        }),
      ],
      providers: [
        CompetitorService,
        {
          provide: IntelligentAgentService,
          useClass: MockIntelligentAgentService,
        },
        {
          provide: WebsiteDiscoveryService,
          useClass: MockWebsiteDiscoveryService,
        },
        {
          provide: ModelManagerService,
          useClass: MockModelManagerService,
        },
        ConfigService,
        Logger,
      ],
    }).compile();

    competitorService = module.get<CompetitorService>(CompetitorService);
    mockIntelligentAgentService = module.get<MockIntelligentAgentService>(
      IntelligentAgentService,
    );
    mockWebsiteDiscoveryService = module.get<MockWebsiteDiscoveryService>(
      WebsiteDiscoveryService,
    );

    // Setup mocks using the mock instance methods
    mockWebsiteDiscoveryService.discoverWebsiteContent.mockImplementation(
      (url) => {
        if (url === testDomain) {
          return Promise.resolve(mockWebsiteContent);
        } else if (url === testProductCatalogUrl) {
          return Promise.resolve(mockCatalogContent);
        }
        // Return a minimal valid WebsiteContent object
        return Promise.resolve(emptyWebsiteContent);
      },
    );

    mockIntelligentAgentService.analyzeCompetitor.mockResolvedValue(
      mockCompetitorInsight,
    );

    mockIntelligentAgentService.discoverCompetitors.mockResolvedValue(
      mockDiscoveredCompetitors,
    );
  });

  describe('discoverCompetitors', () => {
    it('should discover competitors for a domain with known competitors', async () => {
      // Act
      const result: DiscoveryResult =
        await competitorService.discoverCompetitors(
          testDomain,
          testUserId,
          testBusinessType,
          testKnownCompetitors,
          testProductCatalogUrl,
        );

      // Assert
      expect(
        mockWebsiteDiscoveryService.discoverWebsiteContent,
      ).toHaveBeenCalledWith(testDomain);
      expect(
        mockWebsiteDiscoveryService.discoverWebsiteContent,
      ).toHaveBeenCalledWith(testProductCatalogUrl);

      expect(
        mockIntelligentAgentService.discoverCompetitors,
      ).toHaveBeenCalled();

      expect(mockIntelligentAgentService.analyzeCompetitor).toHaveBeenCalled();

      // Check that we got the combined results
      expect(result.competitors).toHaveLength(3); // 2 discovered + 1 known
      expect(result.stats.totalDiscovered).toBe(3);
      expect(result.stats.newCompetitors).toBe(2);
      expect(result.stats.existingCompetitors).toBe(1);

      // Verify we're passing the combined products from both sources
      const productsPassedToAgent =
        mockIntelligentAgentService.discoverCompetitors.mock.calls[0][2];
      expect(productsPassedToAgent).toHaveLength(3); // 2 from main site + 1 from catalog
    });

    it('should handle the case when product catalog URL fails', async () => {
      // Setup mock to fail for catalog URL
      mockWebsiteDiscoveryService.discoverWebsiteContent.mockImplementation(
        (url) => {
          if (url === testDomain) {
            return Promise.resolve(mockWebsiteContent);
          } else if (url === testProductCatalogUrl) {
            return Promise.reject(new Error('Failed to fetch catalog'));
          }
          return Promise.resolve(emptyWebsiteContent);
        },
      );

      // Act
      const result = await competitorService.discoverCompetitors(
        testDomain,
        testUserId,
        testBusinessType,
        testKnownCompetitors,
        testProductCatalogUrl,
      );

      // Assert
      expect(
        mockWebsiteDiscoveryService.discoverWebsiteContent,
      ).toHaveBeenCalledWith(testProductCatalogUrl);

      // Should still work with just the main domain products
      expect(result.competitors).toHaveLength(3);

      // Verify we're passing only the products from the main site
      const productsPassedToAgent =
        mockIntelligentAgentService.discoverCompetitors.mock.calls[0][2];
      expect(productsPassedToAgent).toHaveLength(2); // Just from main site
    });

    it('should handle the case when known competitor analysis fails', async () => {
      // Setup mock to fail for competitor analysis
      mockIntelligentAgentService.analyzeCompetitor.mockImplementation(
        (domain) => {
          if (domain === testKnownCompetitors[0]) {
            return Promise.reject(new Error('Failed to analyze competitor'));
          }
          return Promise.resolve(mockCompetitorInsight);
        },
      );

      // Act
      const result = await competitorService.discoverCompetitors(
        testDomain,
        testUserId,
        testBusinessType,
        testKnownCompetitors,
        testProductCatalogUrl,
      );

      // Assert
      expect(
        mockIntelligentAgentService.analyzeCompetitor,
      ).toHaveBeenCalledWith(
        testKnownCompetitors[0],
        expect.objectContaining({
          domain: testKnownCompetitors[0],
          businessType: testBusinessType,
        }),
      );

      // Should still return the discovered competitors
      expect(result.competitors).toHaveLength(2); // Only discovered ones
    });
  });

  describe('analyzeCompetitor', () => {
    it('should analyze a given competitor domain', async () => {
      // Arrange
      const competitorDomain = 'https://somecompetitor.com';
      const products: Product[] = [
        {
          name: 'Standard Room',
          description: 'Comfortable standard room with mountain view',
          price: 200,
          currency: 'USD',
        },
        {
          name: 'Deluxe Suite',
          description: 'Spacious deluxe suite with private balcony',
          price: 350,
          currency: 'USD',
        },
        {
          name: 'Family Suite',
          description: 'Large suite for families',
          price: 450,
          currency: 'USD',
        },
      ];

      const businessContext = {
        domain: testDomain,
        businessType: testBusinessType,
        products,
      };

      // Act
      const result = await competitorService.analyzeCompetitor(
        competitorDomain,
        businessContext,
      );

      // Assert
      expect(
        mockIntelligentAgentService.analyzeCompetitor,
      ).toHaveBeenCalledWith(competitorDomain, businessContext, undefined);
      expect(result).toEqual(mockCompetitorInsight);
    });

    it('should pass SERP metadata when provided', async () => {
      // Arrange
      const competitorDomain = 'https://somecompetitor.com';
      const products: Product[] = [
        {
          name: 'Standard Room',
          description: 'Comfortable standard room with mountain view',
          price: 200,
          currency: 'USD',
        },
      ];

      const businessContext = {
        domain: testDomain,
        businessType: testBusinessType,
        products,
      };
      const serpMetadata = {
        title: 'Some Competitor',
        snippet: 'Great lodge in the area',
        rating: 4.5,
        reviewCount: 120,
        priceRange: {
          min: 150,
          max: 400,
          currency: 'USD',
        },
      };

      // Act
      const result = await competitorService.analyzeCompetitor(
        competitorDomain,
        businessContext,
        serpMetadata,
      );

      // Assert
      expect(
        mockIntelligentAgentService.analyzeCompetitor,
      ).toHaveBeenCalledWith(competitorDomain, businessContext, serpMetadata);
      expect(result).toEqual(mockCompetitorInsight);
    });
  });
});
