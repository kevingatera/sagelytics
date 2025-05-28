/**
 * Test script for the Perplexity API integration
 *
 * Run with: pnpm ts-node -r tsconfig-paths/register src/test/perplexity.test.ts
 */

import { ConfigService } from '@nestjs/config';
import { PerplexityService } from '../llm-tools/perplexity.service';
import { CompetitorInsight } from '@shared/types';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

// Initialize logger
const logger = new Logger('PerplexityTest');
dotenv.config();

// Test cases
const TEST_DOMAIN = 'airbnb.com';
const TEST_BUSINESS_TYPE = 'vacation rental platform';
const TEST_PRODUCT = 'home sharing';

async function runTests() {
  logger.log('Starting Perplexity API integration tests...');

  // Validate API key exists
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    logger.error(
      'No PERPLEXITY_API_KEY found in environment. Tests cannot run.',
    );
    return;
  }

  // Initialize services
  const configService = new ConfigService();
  const perplexityService = new PerplexityService(configService);

  // Convert to CompetitorInsight format
  const competitorInsights: CompetitorInsight[] = [];
  const allSources: string[] = [];

  try {
    // Test 1: Discover competitors
    logger.log(`Test 1: Discovering competitors for ${TEST_DOMAIN}`);

    const competitors = await perplexityService.discoverCompetitors(
      TEST_DOMAIN,
      TEST_BUSINESS_TYPE,
    );
    logger.log(`Found ${competitors.competitors.length} competitors`);
    logger.log(
      `First few competitors: ${competitors.competitors
        .slice(0, 3)
        .map((c) => c.domain)
        .join(', ')}`,
    );
    logger.log(`Using ${competitors.sources.length} sources`);

    // Track sources separately
    if (competitors.sources && competitors.sources.length > 0) {
      allSources.push(...competitors.sources);
    }

    // Test 2: Research a competitor
    if (competitors.competitors.length > 0) {
      const competitorToResearch = competitors.competitors[0].domain;
      logger.log(`Test 2: Researching competitor ${competitorToResearch}`);

      const competitorDetails = await perplexityService.researchCompetitor(
        competitorToResearch,
        TEST_BUSINESS_TYPE,
      );

      logger.log(
        `Found ${competitorDetails.products.length} products for ${competitorToResearch}`,
      );
      logger.log(
        `Insights summary: ${competitorDetails.insights.substring(0, 100)}...`,
      );

      // Track sources separately
      if (competitorDetails.sources && competitorDetails.sources.length > 0) {
        allSources.push(...competitorDetails.sources);
      }

      // Format as CompetitorInsight
      const insight: CompetitorInsight = {
        domain: competitorToResearch,
        products: competitorDetails.products.map((p) => ({
          name: p.name,
          price: p.price || null,
          currency: p.currency || 'USD',
          url: '',
          matchedProducts: [],
          lastUpdated: new Date().toISOString(),
        })),
        matchScore: 0,
        matchReasons: [],
        suggestedApproach: '',
        dataGaps: [],
        listingPlatforms: [],
      };
      competitorInsights.push(insight);
    }

    // Test 3: General query for market information
    logger.log(
      `Test 3: Querying general information about ${TEST_BUSINESS_TYPE} market`,
    );

    const marketInfo = await perplexityService.queryCompetitorData(
      `What are the current trends and pricing strategies in the ${TEST_BUSINESS_TYPE} industry?`,
      TEST_BUSINESS_TYPE,
      TEST_DOMAIN,
    );

    logger.log(`Received ${marketInfo.content.length} characters of content`);
    logger.log(`Content preview: ${marketInfo.content.substring(0, 150)}...`);

    // Test 4: Product comparison
    logger.log(`Test 4: Comparing ${TEST_PRODUCT} across competitors`);
    if (competitors.competitors.length >= 2) {
      const comparison = await perplexityService.compareProducts(
        TEST_DOMAIN,
        competitors.competitors.slice(0, 3).map((c) => c.domain),
        TEST_PRODUCT,
      );

      logger.log(`Compared ${comparison.comparisons.length} products`);
      logger.log(`Using ${comparison.sources.length} sources for comparison`);

      // Track sources separately
      if (comparison.sources && comparison.sources.length > 0) {
        allSources.push(...comparison.sources);
      }

      // Add comparison data to insights
      comparison.comparisons.forEach((comp) => {
        const existingInsight = competitorInsights.find(
          (ci) => ci.domain === comp.domain,
        );
        if (existingInsight) {
          const existingProduct = existingInsight.products.find(
            (p) => p.name === comp.productName,
          );
          if (!existingProduct) {
            existingInsight.products.push({
              name: comp.productName,
              price: comp.price || null,
              currency: comp.currency || 'USD',
              url: '',
              matchedProducts: [],
              lastUpdated: new Date().toISOString(),
            });
          }
        } else {
          competitorInsights.push({
            domain: comp.domain,
            products: [
              {
                name: comp.productName,
                price: comp.price || null,
                currency: comp.currency || 'USD',
                url: '',
                matchedProducts: [],
                lastUpdated: new Date().toISOString(),
              },
            ],
            matchScore: 0,
            matchReasons: [],
            suggestedApproach: '',
            dataGaps: [],
            listingPlatforms: [],
          });
        }
      });
    } else {
      logger.warn('Not enough competitors discovered to run comparison test');
    }

    logger.log(`Final Competitor Insights:`);
    competitorInsights.forEach((insight, index) => {
      logger.log(`Competitor ${index + 1}: ${insight.domain}`);
      logger.log(`  Products: ${insight.products.length}`);
    });

    logger.log(`Sources found: ${allSources.length}`);

    logger.log('All tests completed successfully');
  } catch (error) {
    logger.error('Test failed with error:', error);
  }
}

// Run the tests
runTests()
  .then(() => {
    logger.log('Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Unhandled error in test script:', error);
    process.exit(1);
  });
