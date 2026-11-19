import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema, validateEnv } from './env';

// Keys read through ConfigService by the competitor, discovery, LLM tool and website code.
const DISCOVERY_CONFIG_KEYS = [
  'NODE_ENV',
  'SPIDER_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'PERPLEXITY_API_KEY',
  'PERPLEXITY_MODEL',
  'PERPLEXITY_MAX_TOKENS',
  'PERPLEXITY_TIMEOUT_MS',
  'PERPLEXITY_SEARCH_CONTEXT_SIZE',
  'PERPLEXITY_ENABLE_MODEL_FALLBACK',
  'PERPLEXITY_DISCOVERY_COST_USD',
  'PERPLEXITY_RESEARCH_COST_USD',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_PRIMARY_FILTER_MODEL',
  'OPENAI_PRIMARY_FILTER_TIMEOUT_MS',
  'OPENAI_PRIMARY_ESCALATION_MODEL',
  'OPENAI_PRIMARY_ESCALATION_TIMEOUT_MS',
  'OPENAI_FALLBACK_FILTER_MODEL',
  'OPENAI_FALLBACK_FILTER_TIMEOUT_MS',
  'OPENAI_FALLBACK_ESCALATION_MODEL',
  'OPENAI_FALLBACK_ESCALATION_TIMEOUT_MS',
  'OPENAI_FALLBACK_INPUT_COST_PER_MTOKEN',
  'OPENAI_FALLBACK_OUTPUT_COST_PER_MTOKEN',
  'OPENAI_FALLBACK_WEB_COST_PER_1K',
  'OPENAI_INPUT_COST_PER_MTOKEN',
  'OPENAI_OUTPUT_COST_PER_MTOKEN',
  'OPENAI_WEB_COST_PER_1K',
  'OPENROUTER_API_KEY',
  'OPENROUTER_BASE_URL',
  'OPENROUTER_FILTER_MODEL',
  'OPENROUTER_FILTER_TIMEOUT_MS',
  'OPENROUTER_ESCALATION_MODEL',
  'OPENROUTER_ESCALATION_TIMEOUT_MS',
  'VALUESERP_API_KEY',
  'VALUESERP_TIMEOUT_MS',
  'VALUESERP_COST_PER_QUERY_USD',
  'DISCOVERY_PIPELINE',
  'DISCOVERY_BUDGET_MS',
  'DISCOVERY_ESCALATION_THRESHOLD',
  'COMPETITOR_DISCOVERY_LIMIT',
  'COMPETITOR_KNOWN_LIMIT',
  'COMPETITOR_RESEARCH_TIMEOUT_MS',
  'COMPETITOR_ENRICHMENT_CONCURRENCY',
  'ENABLE_COMPETITOR_CACHE',
  'ENABLE_MATCH_ENHANCEMENT',
  'MATCH_ENHANCEMENT_TIMEOUT_MS',
  'WEBSITE_DISCOVERY_LLM_TIMEOUT_MS',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_DB',
  'REDIS_USERNAME',
  'REDIS_PASSWORD',
];

const REQUIRED_ENV = {
  SPIDER_API_KEY: 'test-spider-key',
  GROQ_API_KEY: 'test-groq-key',
  GEMINI_API_KEY: 'test-gemini-key',
  VALUESERP_API_KEY: 'test-valueserp-key',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
};

const originals = new Map<string, string | undefined>();

function setEnv(vars: Record<string, string>) {
  for (const [key, value] of Object.entries(vars)) {
    if (!originals.has(key)) {
      originals.set(key, process.env[key]);
    }
    process.env[key] = value;
  }
}

async function loadConfig(): Promise<ConfigService> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        ignoreEnvFile: true,
        isGlobal: true,
        validate: validateEnv,
      }),
    ],
  }).compile();
  return moduleRef.get(ConfigService);
}

describe('env schema coverage', () => {
  it('declares every ConfigService key the discovery code reads', () => {
    const declared = Object.keys(envSchema.shape);

    expect(
      DISCOVERY_CONFIG_KEYS.filter((key) => !declared.includes(key)),
    ).toEqual([]);
  });

  afterEach(() => {
    for (const [key, value] of originals) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    originals.clear();
  });

  it('reads WEBSITE_DISCOVERY_LLM_TIMEOUT_MS from process.env through the schema', async () => {
    setEnv({ ...REQUIRED_ENV, WEBSITE_DISCOVERY_LLM_TIMEOUT_MS: '45000' });

    const config = await loadConfig();

    expect(config.get('WEBSITE_DISCOVERY_LLM_TIMEOUT_MS', '30000')).toBe(
      '45000',
    );
  });

  it('gives a schema default precedence over the code default at the call site', async () => {
    setEnv(REQUIRED_ENV);

    const config = await loadConfig();

    expect(config.get('PERPLEXITY_MAX_TOKENS', '900')).toBe('1200');
  });

  it('defaults the OpenAI and OpenRouter base URLs to their public endpoints', async () => {
    setEnv(REQUIRED_ENV);

    const config = await loadConfig();

    expect(config.get('OPENAI_BASE_URL')).toBe('https://api.openai.com/v1');
    expect(config.get('OPENROUTER_BASE_URL')).toBe(
      'https://openrouter.ai/api/v1',
    );
  });
});
