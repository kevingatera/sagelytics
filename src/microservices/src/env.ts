import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  SPIDER_API_KEY: z.string(),
  GROQ_API_KEY: z.string(),
  GEMINI_API_KEY: z.string(),
  VALUESERP_API_KEY: z.string(),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),
  REDIS_TLS: z.preprocess(
    (val) => (typeof val === 'string' ? val === 'true' : val),
    z.boolean()
  ).default(false),
  MICROSERVICE_HOST: z.string().default('localhost'),
  MICROSERVICE_PORT: z.string().transform(Number).default('3001'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables');
  }
  
  return result.data;
} 