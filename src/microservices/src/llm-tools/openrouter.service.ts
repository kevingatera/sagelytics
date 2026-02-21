import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { safeJsonParse } from '../common/utils/json-parse';
import { normalizeDomain } from '../common/utils/domain';

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenRouterOptions = {
  temperature?: number;
  timeoutMs?: number;
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

  async chatCompletion(
    model: string,
    messages: OpenRouterMessage[],
    options?: OpenRouterOptions,
  ): Promise<OpenRouterResponse> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for two-stage discovery');
    }

    const timeoutMs = options?.timeoutMs ?? 45000;
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
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
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

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, unknown>;
    };

    const content = payload.choices?.[0]?.message?.content?.trim() ?? '';
    const usage = this.extractUsage(payload.usage);

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
}
