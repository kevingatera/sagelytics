import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeJsonParse } from '../common/utils/json-parse';
import { normalizeDomain } from '../common/utils/domain';
import {
  requestSignal,
  usageReporter,
  type ProviderCallOptions,
  type ProviderUsageEvent,
  type ProviderUsageSink,
} from './provider-usage';

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenRouterOptions = ProviderCallOptions & {
  temperature?: number;
  operation?: ProviderUsageEvent['operation'];
};

export type OpenRouterUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  costUsd?: number;
};

export type OpenRouterResponse = {
  content: string;
  usage: OpenRouterUsage;
  raw: unknown;
};

export type StrictFilterResult = {
  competitors: Array<{ domain: string; reason?: string }>;
  excluded: Array<{ domain: string; why?: string }>;
  usage: OpenRouterUsage;
  rawText: string;
};

export type EscalationResult = {
  competitors: Array<{ domain: string; reason?: string }>;
  usage: OpenRouterUsage;
  rawText: string;
};

type StrictCandidate = {
  domain: string;
  source?: 'perplexity' | 'serp' | 'known' | 'escalation';
  reason?: string;
  title?: string;
  snippet?: string;
};

type SerpSnippet = {
  domain: string;
  title?: string;
  snippet?: string;
};

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey?: string;
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
  }

  async strictCompetitorFilterViaOpenAi(params: {
    domain: string;
    businessType: string;
    region: string;
    candidates: StrictCandidate[];
    serpSnippets: SerpSnippet[];
    timeoutMs?: number;
    signal?: AbortSignal;
    onUsage?: ProviderUsageSink;
  }): Promise<StrictFilterResult> {
    const businessTypeSpecific = params.businessType || 'business services';
    const userPrompt = `Target business: https://${normalizeDomain(params.domain)}
Business type: ${params.businessType || 'unknown'} (local, ${params.region || 'unknown region'})

SERP snippets:
${JSON.stringify(params.serpSnippets.slice(0, 20), null, 2)}

Perplexity candidates:
${JSON.stringify(params.candidates.slice(0, 20), null, 2)}

Task:
- Return ONLY DIRECT local competitors that provide ${businessTypeSpecific} near ${params.region || 'the target region'}.
- Hard exclusions: directories, OTAs, travel blogs, tour operators, official tourism portals, social networks, marketplaces.
- If unsure, put domain in excluded with reason.

Return strict JSON only:
{
  "competitors": [{"domain": string, "reason": string}],
  "excluded": [{"domain": string, "why": string}]
}`;

    const result = await this.openAiResponsesCompletion({
      model: this.getConfigValue(
        ['OPENAI_PRIMARY_FILTER_MODEL', 'OPENAI_FALLBACK_FILTER_MODEL'],
        'gpt-5-mini',
      ),
      userPrompt,
      timeoutMs:
        params.timeoutMs ??
        Number(
          this.getConfigValue(
            [
              'OPENAI_PRIMARY_FILTER_TIMEOUT_MS',
              'OPENAI_FALLBACK_FILTER_TIMEOUT_MS',
            ],
            '60000',
          ),
        ),
      withWebSearch: false,
      operation: 'filter',
      signal: params.signal,
      onUsage: params.onUsage,
    });

    const parsed = safeJsonParse<{
      competitors?: Array<{ domain?: string; reason?: string }>;
      excluded?: Array<{ domain?: string; why?: string }>;
    }>(result.content);

    if (!parsed) {
      throw new Error('OpenAI primary strict filter returned invalid JSON');
    }

    return {
      competitors: (parsed.competitors ?? [])
        .filter((item) => typeof item.domain === 'string' && item.domain.trim().length > 0)
        .map((item) => ({
          domain: normalizeDomain(item.domain ?? ''),
          reason: item.reason,
        }))
        .filter((item) => item.domain.length > 0),
      excluded: (parsed.excluded ?? [])
        .filter((item) => typeof item.domain === 'string' && item.domain.trim().length > 0)
        .map((item) => ({
          domain: normalizeDomain(item.domain ?? ''),
          why: item.why,
        }))
        .filter((item) => item.domain.length > 0),
      usage: result.usage,
      rawText: result.content,
    };
  }

  async webSearchDiscoveryViaOpenAi(params: {
    domain: string;
    businessType: string;
    region: string;
    timeoutMs?: number;
    signal?: AbortSignal;
    onUsage?: ProviderUsageSink;
  }): Promise<EscalationResult> {
    const prompt = `Target business: https://${normalizeDomain(params.domain)}
Business type: ${params.businessType || 'unknown'} (local, ${params.region || 'unknown region'})

Task:
- Discover direct local competitors for this business.
- Prioritize official business websites.
- Exclude directories, OTAs, social networks, travel blogs, marketplaces, and portals.

Return strict JSON only:
{
  "competitors": [{"domain": string, "reason": string}]
}`;

    const result = await this.openAiResponsesCompletion({
      model: this.getConfigValue(
        ['OPENAI_PRIMARY_ESCALATION_MODEL', 'OPENAI_FALLBACK_ESCALATION_MODEL'],
        'gpt-5-mini',
      ),
      userPrompt: prompt,
      timeoutMs:
        params.timeoutMs ??
        Number(
          this.getConfigValue(
            [
              'OPENAI_PRIMARY_ESCALATION_TIMEOUT_MS',
              'OPENAI_FALLBACK_ESCALATION_TIMEOUT_MS',
            ],
            '180000',
          ),
        ),
      withWebSearch: true,
      operation: 'escalation',
      signal: params.signal,
      onUsage: params.onUsage,
    });

    const parsed = safeJsonParse<{
      competitors?: Array<{ domain?: string; reason?: string }>;
    }>(result.content);

    if (!parsed) {
      this.logger.warn(
        'OpenAI primary escalation returned non-JSON output; using empty competitor list',
      );
      return {
        competitors: [],
        usage: result.usage,
        rawText: result.content,
      };
    }

    return {
      competitors: (parsed.competitors ?? [])
        .filter((item) => typeof item.domain === 'string' && item.domain.trim().length > 0)
        .map((item) => ({
          domain: normalizeDomain(item.domain ?? ''),
          reason: item.reason,
        }))
        .filter((item) => item.domain.length > 0),
      usage: result.usage,
      rawText: result.content,
    };
  }

  async chatCompletion(
    model: string,
    messages: OpenRouterMessage[],
    options?: OpenRouterOptions,
  ): Promise<OpenRouterResponse> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for two-stage discovery');
    }
    options?.signal?.throwIfAborted();

    // Every dispatched request reports exactly once, including ones that fail or lose their JSON.
    const reportUsage = usageReporter(options, {
      provider: 'openrouter',
      operation: options?.operation ?? 'other',
      model,
    });
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: options?.temperature ?? 0,
        messages,
      }),
      signal: requestSignal(options?.signal, options?.timeoutMs ?? 45000),
    }).catch((error: unknown) => {
      reportUsage(null);
      throw error;
    });

    if (!response.ok) {
      reportUsage(null);
      const body = await response.text();
      const status = response.status;
      if (status === 401) {
        throw new Error(`OpenRouter unauthorized (401): ${body.slice(0, 220)}`);
      }
      if (status === 429) {
        throw new Error(`OpenRouter rate limited (429): ${body.slice(0, 220)}`);
      }
      if (status >= 500) {
        throw new Error(
          `OpenRouter upstream error (${status}): ${body.slice(0, 220)}`,
        );
      }
      throw new Error(`OpenRouter request failed (${status}): ${body.slice(0, 220)}`);
    }

    let payload: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, unknown>;
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch (error) {
      reportUsage(null);
      throw error;
    }

    const usage = this.extractUsage(payload.usage);
    reportUsage(usage.costUsd ?? null);
    const content = payload.choices?.[0]?.message?.content?.trim() ?? '';

    return {
      content,
      usage,
      raw: payload,
    };
  }

  async strictCompetitorFilter(params: {
    domain: string;
    businessType: string;
    region: string;
    candidates: StrictCandidate[];
    serpSnippets: SerpSnippet[];
    timeoutMs?: number;
    signal?: AbortSignal;
    onUsage?: ProviderUsageSink;
  }): Promise<StrictFilterResult> {
    const model = this.configService.get<string>(
      'OPENROUTER_FILTER_MODEL',
      'openai/gpt-5-mini',
    );

    const businessTypeSpecific = params.businessType || 'business services';
    const userPrompt = `Target business: https://${normalizeDomain(params.domain)}
Business type: ${params.businessType || 'unknown'} (local, ${params.region || 'unknown region'})

SERP snippets:
${JSON.stringify(params.serpSnippets.slice(0, 20), null, 2)}

Perplexity candidates:
${JSON.stringify(params.candidates.slice(0, 20), null, 2)}

Task:
- Return ONLY DIRECT local competitors that provide ${businessTypeSpecific} near ${params.region || 'the target region'}.
- Hard exclusions: directories, OTAs, travel blogs, tour operators, official tourism portals, social networks, marketplaces.
- If unsure, put domain in excluded with reason.

Return strict JSON only:
{
  "competitors": [{"domain": string, "reason": string}],
  "excluded": [{"domain": string, "why": string}]
}`;

    const completion = await this.chatCompletion(
      model,
      [
        { role: 'system', content: 'Return strict JSON only.' },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0,
        timeoutMs:
          params.timeoutMs ??
          Number(this.configService.get<string>('OPENROUTER_FILTER_TIMEOUT_MS', '45000')),
        signal: params.signal,
        onUsage: params.onUsage,
        operation: 'filter',
      },
    );

    const parsed = safeJsonParse<{
      competitors?: Array<{ domain?: string; reason?: string }>;
      excluded?: Array<{ domain?: string; why?: string }>;
    }>(completion.content);

    if (!parsed) {
      throw new Error('OpenRouter strict competitor filter returned invalid JSON');
    }

    return {
      competitors: (parsed.competitors ?? [])
        .filter((item) => typeof item.domain === 'string' && item.domain.trim().length > 0)
        .map((item) => ({
          domain: normalizeDomain(item.domain ?? ''),
          reason: item.reason,
        }))
        .filter((item) => item.domain.length > 0),
      excluded: (parsed.excluded ?? [])
        .filter((item) => typeof item.domain === 'string' && item.domain.trim().length > 0)
        .map((item) => ({
          domain: normalizeDomain(item.domain ?? ''),
          why: item.why,
        }))
        .filter((item) => item.domain.length > 0),
      usage: completion.usage,
      rawText: completion.content,
    };
  }

  async webSearchDiscovery(params: {
    domain: string;
    businessType: string;
    region: string;
    timeoutMs?: number;
    signal?: AbortSignal;
    onUsage?: ProviderUsageSink;
  }): Promise<EscalationResult> {
    const model = this.configService.get<string>(
      'OPENROUTER_ESCALATION_MODEL',
      'openai/gpt-5-mini:online',
    );

    const prompt = `Target business: https://${normalizeDomain(params.domain)}
Business type: ${params.businessType || 'unknown'} (local, ${params.region || 'unknown region'})

Task:
- Discover direct local competitors for this business.
- Prioritize official business websites.
- Exclude directories, OTAs, social networks, travel blogs, marketplaces, and portals.

Return strict JSON only:
{
  "competitors": [{"domain": string, "reason": string}]
}`;

    const completion = await this.chatCompletion(
      model,
      [
        { role: 'system', content: 'Return strict JSON only.' },
        { role: 'user', content: prompt },
      ],
      {
        temperature: 0,
        timeoutMs:
          params.timeoutMs ??
          Number(
            this.configService.get<string>(
              'OPENROUTER_ESCALATION_TIMEOUT_MS',
              '180000',
            ),
          ),
        signal: params.signal,
        onUsage: params.onUsage,
        operation: 'escalation',
      },
    );

    const parsed = safeJsonParse<{
      competitors?: Array<{ domain?: string; reason?: string }>;
    }>(completion.content);

    if (!parsed) {
      this.logger.warn('Escalation returned non-JSON output; using empty competitor list');
      return {
        competitors: [],
        usage: completion.usage,
        rawText: completion.content,
      };
    }

    return {
      competitors: (parsed.competitors ?? [])
        .filter((item) => typeof item.domain === 'string' && item.domain.trim().length > 0)
        .map((item) => ({
          domain: normalizeDomain(item.domain ?? ''),
          reason: item.reason,
        }))
        .filter((item) => item.domain.length > 0),
      usage: completion.usage,
      rawText: completion.content,
    };
  }

  private extractUsage(usage: Record<string, unknown> | undefined): OpenRouterUsage {
    if (!usage) {
      return {};
    }

    return {
      promptTokens: this.toNumber(usage.prompt_tokens),
      completionTokens: this.toNumber(usage.completion_tokens),
      totalTokens: this.toNumber(usage.total_tokens),
      costUsd: this.toNumber(usage.cost),
    };
  }

  private async openAiResponsesCompletion(params: {
    model: string;
    userPrompt: string;
    timeoutMs: number;
    withWebSearch: boolean;
    operation: 'filter' | 'escalation';
    signal?: AbortSignal;
    onUsage?: ProviderUsageSink;
  }): Promise<{ content: string; usage: OpenRouterUsage; raw: unknown }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for OpenAI primary filtering');
    }
    params.signal?.throwIfAborted();

    const body: Record<string, unknown> = {
      model: params.model,
      input: [
        { role: 'system', content: 'Return strict JSON only.' },
        { role: 'user', content: params.userPrompt },
      ],
    };

    if (params.withWebSearch) {
      body.tools = [{ type: 'web_search_preview' }];
    }

    const reportUsage = usageReporter(
      { onUsage: params.onUsage },
      { provider: 'openai', operation: params.operation, model: params.model },
    );
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: requestSignal(params.signal, params.timeoutMs),
    }).catch((error: unknown) => {
      reportUsage(null);
      throw error;
    });

    if (!response.ok) {
      reportUsage(null);
      const errBody = await response.text();
      const status = response.status;
      if (status === 401) {
        throw new Error(
          `OpenAI primary unauthorized (401): ${errBody.slice(0, 220)}`,
        );
      }
      if (status === 429) {
        throw new Error(
          `OpenAI primary rate-limited or out-of-quota (429): ${errBody.slice(0, 220)}`,
        );
      }
      if (status >= 500) {
        throw new Error(
          `OpenAI primary upstream error (${status}): ${errBody.slice(0, 220)}`,
        );
      }
      throw new Error(
        `OpenAI primary request failed (${status}): ${errBody.slice(0, 220)}`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      reportUsage(null);
      throw error;
    }
    const usage = this.extractOpenAiUsage(payload);
    reportUsage(usage.costUsd ?? null);
    const content = this.extractOpenAiOutputText(payload);

    return { content, usage, raw: payload };
  }

  private extractOpenAiOutputText(payload: unknown): string {
    if (payload && typeof payload === 'object') {
      const obj = payload as {
        output_text?: unknown;
        output?: Array<{ content?: Array<{ text?: string }> }>;
      };

      if (
        typeof obj.output_text === 'string' &&
        obj.output_text.trim().length > 0
      ) {
        return obj.output_text;
      }

      if (Array.isArray(obj.output)) {
        const chunks = obj.output.flatMap((item) =>
          Array.isArray(item.content)
            ? item.content
                .map((c) => (typeof c?.text === 'string' ? c.text : ''))
                .filter(Boolean)
            : [],
        );
        if (chunks.length > 0) {
          return chunks.join('\n');
        }
      }
    }

    return typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  private extractOpenAiUsage(payload: unknown): OpenRouterUsage {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const usage = (payload as { usage?: Record<string, unknown> }).usage;
    const output = (payload as { output?: unknown[] }).output;
    const webSearchCalls = Array.isArray(output)
      ? output.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          const t = (item as { type?: unknown }).type;
          return typeof t === 'string' && t.includes('web_search');
        }).length
      : 0;

    const promptTokens =
      this.toNumber(usage?.input_tokens) ?? this.toNumber(usage?.prompt_tokens);
    const completionTokens =
      this.toNumber(usage?.output_tokens) ??
      this.toNumber(usage?.completion_tokens);
    const totalTokens = this.toNumber(usage?.total_tokens);

    const inputPerM = this.toNumber(
      this.getConfigValue(
        ['OPENAI_INPUT_COST_PER_MTOKEN', 'OPENAI_FALLBACK_INPUT_COST_PER_MTOKEN'],
        '0.25',
      ),
    );
    const outputPerM = this.toNumber(
      this.getConfigValue(
        [
          'OPENAI_OUTPUT_COST_PER_MTOKEN',
          'OPENAI_FALLBACK_OUTPUT_COST_PER_MTOKEN',
        ],
        '2',
      ),
    );
    const webPerK = this.toNumber(
      this.getConfigValue(
        ['OPENAI_WEB_COST_PER_1K', 'OPENAI_FALLBACK_WEB_COST_PER_1K'],
        '10',
      ),
    );

    let costUsd: number | undefined;
    if (typeof promptTokens === 'number' || typeof completionTokens === 'number') {
      costUsd = Number(
        (
          ((promptTokens ?? 0) / 1_000_000) * (inputPerM ?? 0) +
          ((completionTokens ?? 0) / 1_000_000) * (outputPerM ?? 0) +
          (webSearchCalls / 1000) * (webPerK ?? 0)
        ).toFixed(6),
      );
    }

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
    };
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private getConfigValue(keys: string[], fallback: string): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return fallback;
  }
}
