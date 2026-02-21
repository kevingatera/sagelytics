import { z } from 'zod';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidator');

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().transform(Number).default('3000'),
  SPIDER_API_KEY: z.string(),
  GROQ_API_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
  PERPLEXITY_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_MODEL: z.string().default('sonar'),
  PERPLEXITY_MAX_TOKENS: z.string().default('1200'),
  PERPLEXITY_ENABLE_MODEL_FALLBACK: z.string().default('false'),
  PERPLEXITY_SEARCH_CONTEXT_SIZE: z
    .enum(['low', 'medium', 'high'])
    .default('medium'),
  PERPLEXITY_TIMEOUT_MS: z.string().default('45000'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_FILTER_MODEL: z.string().default('openai/gpt-5-mini'),
  OPENROUTER_FILTER_TIMEOUT_MS: z.string().default('45000'),
  OPENROUTER_ESCALATION_MODEL: z
    .string()
    .default('openai/gpt-5-mini:online'),
  OPENROUTER_ESCALATION_TIMEOUT_MS: z.string().default('180000'),
  DISCOVERY_PIPELINE: z.enum(['legacy', 'two_stage']).default('legacy'),
  DISCOVERY_ESCALATION_THRESHOLD: z.string().default('2'),
  COMPETITOR_DISCOVERY_LIMIT: z.string().default('3'),
  COMPETITOR_KNOWN_LIMIT: z.string().default('2'),
  COMPETITOR_RESEARCH_TIMEOUT_MS: z.string().default('30000'),
  MATCH_ENHANCEMENT_TIMEOUT_MS: z.string().default('12000'),
  ENABLE_MATCH_ENHANCEMENT: z.string().default('false'),
  VALUESERP_API_KEY: z.string().min(1),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_TLS: z
    .preprocess(
      (val) => (typeof val === 'string' ? val === 'true' : val),
      z.boolean(),
    )
    .default(false),
  MICROSERVICE_HOST: z.string().default('localhost'),
  MICROSERVICE_PORT: z.string().transform(Number).default('3001'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  logger.debug('Validating environment variables...');

  const result = envSchema.safeParse(config);

  if (!result.success) {
    logger.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }

  logger.debug('Environment validation successful');

  // Log key settings (without sensitive data)
  logger.debug({
    NODE_ENV: result.data.NODE_ENV,
    PORT: result.data.PORT,
    REDIS_URL: result.data.REDIS_URL.replace(/\/\/(.+):(.+)@/, '//***:***@'), // Mask credentials
    REDIS_DB: result.data.REDIS_DB,
    REDIS_TLS: result.data.REDIS_TLS,
    MICROSERVICE_HOST: result.data.MICROSERVICE_HOST,
    MICROSERVICE_PORT: result.data.MICROSERVICE_PORT,
    HAS_PERPLEXITY_API: !!result.data.PERPLEXITY_API_KEY,
    HAS_OPENAI_API: !!result.data.OPENAI_API_KEY,
    HAS_OPENROUTER_API: !!result.data.OPENROUTER_API_KEY,
    PERPLEXITY_MODEL: result.data.PERPLEXITY_MODEL,
    PERPLEXITY_MAX_TOKENS: result.data.PERPLEXITY_MAX_TOKENS,
    PERPLEXITY_ENABLE_MODEL_FALLBACK:
      result.data.PERPLEXITY_ENABLE_MODEL_FALLBACK,
    PERPLEXITY_SEARCH_CONTEXT_SIZE: result.data.PERPLEXITY_SEARCH_CONTEXT_SIZE,
    PERPLEXITY_TIMEOUT_MS: result.data.PERPLEXITY_TIMEOUT_MS,
    OPENROUTER_FILTER_MODEL: result.data.OPENROUTER_FILTER_MODEL,
    OPENROUTER_FILTER_TIMEOUT_MS: result.data.OPENROUTER_FILTER_TIMEOUT_MS,
    OPENROUTER_ESCALATION_MODEL: result.data.OPENROUTER_ESCALATION_MODEL,
    OPENROUTER_ESCALATION_TIMEOUT_MS:
      result.data.OPENROUTER_ESCALATION_TIMEOUT_MS,
    DISCOVERY_PIPELINE: result.data.DISCOVERY_PIPELINE,
    DISCOVERY_ESCALATION_THRESHOLD: result.data.DISCOVERY_ESCALATION_THRESHOLD,
    COMPETITOR_DISCOVERY_LIMIT: result.data.COMPETITOR_DISCOVERY_LIMIT,
    COMPETITOR_KNOWN_LIMIT: result.data.COMPETITOR_KNOWN_LIMIT,
    COMPETITOR_RESEARCH_TIMEOUT_MS: result.data.COMPETITOR_RESEARCH_TIMEOUT_MS,
    MATCH_ENHANCEMENT_TIMEOUT_MS: result.data.MATCH_ENHANCEMENT_TIMEOUT_MS,
    ENABLE_MATCH_ENHANCEMENT: result.data.ENABLE_MATCH_ENHANCEMENT,
  });

  return result.data;
}
