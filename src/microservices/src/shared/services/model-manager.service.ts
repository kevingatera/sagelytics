import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { Env } from '../../env';
import { ConfigService } from '@nestjs/config';

type LLMProvider = 'groq' | 'gemini';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  modelName: string;
  responseFormat?: {
    type: "json_object";
  };
}

interface LLMInstance {
  llm: ChatGroq | ChatGoogleGenerativeAI;
  provider: LLMProvider;
}

type ModelConfig = {
  provider: LLMProvider;
  model: string;
  tokensPerMinute: number;
  requestsPerMinute: number;
  tokensPerDay?: number;
  requestsPerDay?: number;
  qualityScore: number;     // 0-100
  throughput: number;       // tokens/sec
  latency: number;         // seconds
  contextWindow: number;    // tokens
  complexity: number;      // 0-100, higher means better at complex tasks
};

const MODELS: ModelConfig[] = [
  { 
    provider: 'groq',
    model: "llama3-70b-8192",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 74,
    throughput: 71.5,
    latency: 0.50,
    contextWindow: 128000,
    complexity: 90
  },
  {
    provider: 'gemini',
    model: "gemini-2.0-flash",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 75,
    throughput: 80,
    latency: 0.45,
    contextWindow: 32000,
    complexity: 85
  },
  { 
    provider: 'groq',
    model: "deepseek-r1-distill-llama-70b",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 70,
    throughput: 65,
    latency: 0.55,
    contextWindow: 128000,
    complexity: 85
  },
  { 
    provider: 'groq',
    model: "llama3-8b-8192",
    tokensPerMinute: 6000,
    requestsPerMinute: 30,
    qualityScore: 65,
    throughput: 120,
    latency: 0.35,
    contextWindow: 8192,
    complexity: 60
  }
];

type ModelUsage = {
  lastUsed: number;
  tokensUsed: number;
  requestsUsed: number;
};

type TaskComplexity = 'simple' | 'medium' | 'complex';

type BatchRequest<T> = {
  prompt: string;
  operation: (llm: ChatGroq | ChatGoogleGenerativeAI) => Promise<T>;
  preferredModel?: string;
  priority?: number;
};

type BatchQueue<T> = {
  requests: BatchRequest<T>[];
  timestamp: number;
  processing: boolean;
};

@Injectable()
export class ModelManagerService implements OnModuleDestroy {
  private modelUsage: Map<string, ModelUsage>;
  private retryDelays: number[];
  private batchQueues: Map<string, BatchQueue<any>>;
  private batchProcessingIntervals: Map<string, NodeJS.Timeout>;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_WINDOW_MS = 10000;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.modelUsage = new Map();
    this.retryDelays = [1000, 2000, 4000, 8000, 16000];
    this.batchQueues = new Map();
    this.batchProcessingIntervals = new Map();

    // Initialize all models
    MODELS.forEach(({ model }) => {
      this.modelUsage.set(model, {
        lastUsed: 0,
        tokensUsed: 0,
        requestsUsed: 0,
      });
      this.batchQueues.set(model, {
        requests: [],
        timestamp: Date.now(),
        processing: false
      });
      
      const interval = setInterval(() => {
        this.processQueueForModel(model).catch(console.error);
      }, this.BATCH_WINDOW_MS);
      
      this.batchProcessingIntervals.set(model, interval);
    });

    // Verify API keys are present
    const groqKey = this.configService.get('GROQ_API_KEY');
    const geminiKey = this.configService.get('GEMINI_API_KEY');

    if (!groqKey) console.warn('GROQ_API_KEY not found in environment');
    if (!geminiKey) console.warn('GEMINI_API_KEY not found in environment');
  }

  onModuleDestroy() {
    for (const interval of this.batchProcessingIntervals.values()) {
      clearInterval(interval);
    }
    this.batchProcessingIntervals.clear();
  }

  private getTaskComplexity(prompt: string): TaskComplexity {
    const hasJsonParsing = prompt.includes('Return ONLY a JSON');
    const hasMultipleSteps = prompt.includes('considering:') || prompt.includes('steps:');
    const hasAnalysis = prompt.includes('Analyze') || prompt.includes('Compare');
    
    if (hasJsonParsing && hasMultipleSteps && hasAnalysis) return 'complex';
    if (hasJsonParsing || hasMultipleSteps || hasAnalysis) return 'medium';
    return 'simple';
  }

  private getModelScore(model: ModelConfig, taskComplexity: TaskComplexity): number {
    const weights = {
      simple: {
        qualityScore: 0.2,
        throughput: 0.3,
        latency: 0.3,
        contextWindow: 0.1,
        complexity: 0.1
      },
      medium: {
        qualityScore: 0.3,
        throughput: 0.2,
        latency: 0.2,
        contextWindow: 0.1,
        complexity: 0.2
      },
      complex: {
        qualityScore: 0.3,
        throughput: 0.1,
        latency: 0.1,
        contextWindow: 0.2,
        complexity: 0.3
      }
    };

    const w = weights[taskComplexity];
    const normalizedContextWindow = model.contextWindow / 128000;
    
    return (
      w.qualityScore * (model.qualityScore / 100) +
      w.throughput * (model.throughput / 120) +
      w.latency * (1 - model.latency / 1) +
      w.contextWindow * normalizedContextWindow +
      w.complexity * (model.complexity / 100)
    );
  }

  private getBestAvailableModel(taskComplexity: TaskComplexity): string | null {
    const availableModels = MODELS.filter(m => this.canUseModel(m.model))
      .sort((a, b) => this.getModelScore(b, taskComplexity) - this.getModelScore(a, taskComplexity));
    
    return availableModels[0]?.model || null;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private resetUsageIfNeeded(model: string): void {
    const usage = this.modelUsage.get(model);
    if (!usage) return;

    const now = Date.now();
    const minuteAgo = now - 60000;

    if (usage.lastUsed < minuteAgo) {
      this.modelUsage.set(model, {
        lastUsed: now,
        tokensUsed: 0,
        requestsUsed: 0,
      });
    }
  }

  private canUseModel(model: string): boolean {
    const config = MODELS.find(m => m.model === model);
    const usage = this.modelUsage.get(model);
    
    if (!config || !usage) return false;
    
    this.resetUsageIfNeeded(model);
    
    return usage.tokensUsed < config.tokensPerMinute &&
           usage.requestsUsed < config.requestsPerMinute;
  }

  private updateUsage(model: string, tokens: number): void {
    const usage = this.modelUsage.get(model);
    if (!usage) return;

    this.modelUsage.set(model, {
      lastUsed: Date.now(),
      tokensUsed: usage.tokensUsed + tokens,
      requestsUsed: usage.requestsUsed + 1,
    });
  }

  private createLLMInstance(config: ModelConfig): LLMInstance {
    switch (config.provider) {
      case 'groq':
        return {
          llm: new ChatGroq({
            apiKey: this.configService.get('GROQ_API_KEY'),
            modelName: config.model
          }),
          provider: 'groq'
        };
      case 'gemini':
        return {
          llm: new ChatGoogleGenerativeAI({
            apiKey: this.configService.get('GEMINI_API_KEY'),
            modelName: config.model
          }),
          provider: 'gemini'
        };
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async getLLM(prompt: string, preferredModel = "gemini-2.0-flash"): Promise<ChatGroq | ChatGoogleGenerativeAI> {
    const taskComplexity = this.getTaskComplexity(prompt);
    
    for (const delay of this.retryDelays) {
      if (preferredModel && this.canUseModel(preferredModel)) {
        const model = MODELS.find(m => m.model === preferredModel);
        if (!model) throw new Error(`Model ${preferredModel} not found`);
        return this.createLLMInstance(model).llm;
      }

      const bestModel = this.getBestAvailableModel(taskComplexity);
      if (bestModel) {
        const model = MODELS.find(m => m.model === bestModel);
        if (!model) throw new Error(`Model ${bestModel} not found`);
        
        if (bestModel !== preferredModel) {
          console.log(`Using optimized model for ${taskComplexity} task: ${bestModel} (${model.provider})`);
        }
        return this.createLLMInstance(model).llm;
      }

      await this.sleep(delay);
    }

    throw new Error("All models are rate limited. Please try again later.");
  }

  private async processQueueForModel(model: string): Promise<void> {
    const queue = this.batchQueues.get(model);
    if (!queue || queue.processing || queue.requests.length === 0) {
      return;
    }

    queue.processing = true;
    try {
      const batchSize = Math.min(queue.requests.length, this.BATCH_SIZE);
      const batch = queue.requests.splice(0, batchSize);
      await this.processBatch(model, batch);
    } finally {
      queue.processing = false;
      queue.timestamp = Date.now();
    }
  }

  private async processBatch<T>(model: string, batch: BatchRequest<T>[]): Promise<void> {
    const modelConfig = MODELS.find(m => m.model === model);
    if (!modelConfig) throw new Error(`Model ${model} not found`);
    
    const { llm } = this.createLLMInstance(modelConfig);
    let totalTokens = 0;

    for (const request of batch) {
      try {
        const result = await request.operation(llm);
        const tokens = JSON.stringify(result).length / 4;
        totalTokens += tokens;
        this.updateUsage(model, tokens);
        await this.sleep(100);
      } catch (error) {
        console.error('Batch request failed:', error);
      }
    }
  }

  private enforceJsonOutput(prompt: string): string {
    return `${prompt.trim()}

Instructions:
1. Return ONLY a valid JSON object/array
2. Do not include any explanatory text
3. Do not include markdown formatting
4. Do not include code blocks
5. The response should be parseable by JSON.parse()

Example of correct format:
{"key": "value"} or ["item1", "item2"]`;
  }

  async withBatchProcessing<T>(
    operation: (llm: ChatGroq | ChatGoogleGenerativeAI) => Promise<T>,
    prompt: string,
    preferredModel?: string
  ): Promise<T> {
    const taskComplexity = this.getTaskComplexity(prompt);
    const model = preferredModel || this.getBestAvailableModel(taskComplexity) || MODELS[0]?.model;
    
    const queue = this.batchQueues.get(model);
    if (!queue) {
      throw new Error(`No queue found for model ${model}`);
    }

    return new Promise((resolve, reject) => {
      const request: BatchRequest<T> = {
        prompt: this.enforceJsonOutput(prompt),
        operation: async (llm) => {
          try {
            const result = await operation(llm);
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        preferredModel: model
      };

      queue.requests.push(request);
    });
  }

  // async testProviders(): Promise<{ groq: boolean; gemini: boolean }> {
  //   const results = { groq: false, gemini: false };
  //   const testPrompt = 'Return a simple JSON response with {"test": "success"}';
  //   const message = new HumanMessage(testPrompt);

  //   try {
  //     // Test Groq
  //     const groqModel = MODELS.find(m => m.provider === 'groq');
  //     if (groqModel) {
  //       const groqLLM = await this.getLLM(testPrompt, groqModel.model);
  //       const groqResult = await groqLLM.invoke([message]);
  //       results.groq = groqResult.content.toString().includes('success');
  //     }
  //   } catch (error) {
  //     console.error('Groq test failed:', error);
  //   }

  //   try {
  //     // Test Gemini
  //     const geminiModel = MODELS.find(m => m.provider === 'gemini');
  //     if (geminiModel) {
  //       const geminiLLM = await this.getLLM(testPrompt, geminiModel.model);
  //       const geminiResult = await geminiLLM.invoke([message]);
  //       results.gemini = geminiResult.content.toString().includes('success');
  //     }
  //   } catch (error) {
  //     console.error('Gemini test failed:', error);
  //   }

  //   return results;
  // }
} 