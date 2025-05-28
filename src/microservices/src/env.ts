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
  });

  return result.data;
}
